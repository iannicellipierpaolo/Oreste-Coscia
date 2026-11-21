(() => {
  "use strict";

  const carousel = document.querySelector(".carousel");
  if (!carousel) return;

  const stage = carousel.querySelector(".carousel-stage");
  const status = carousel.querySelector("#carousel-status");
  const previous = carousel.querySelector(".prev");
  const next = carousel.querySelector(".next");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const config = window.ORESTE_CONFIG || {};
  const galleryURL = new URL("assets/gallery/", document.baseURI);
  const collator = new Intl.Collator("it", { numeric: true, sensitivity: "base" });
  const imagePattern = /\.(avif|webp|jpe?g|png|gif)$/i;
  // Esclude i vecchi soggetti anche se ancora presenti nel repository remoto.
  const retiredPhotos = new Set([
    "tattoo-01-ritratto",
    "tattoo-02-tigre",
    "tattoo-03-ornamentale",
    "tattoo-04-serpente",
    "tattoo-05-farfalla-lettering"
  ]);
  const interval = 5000;
  const duration = 700;
  const cards = [];

  let photos = [];
  let current = 0;
  let timer = null;
  let transitionTimer = null;
  let animating = false;
  let inView = false;
  let keyboardFocus = false;
  let touchStart = null;

  // Un solo soggetto se esistono sia l'originale sia l'anteprima -bw.
  function normalize(files) {
    const unique = new Map();
    const priority = (name) => {
      return (/-bw\./i.test(name) ? 10 : 0) + (/\.webp$/i.test(name) ? 1 : 0);
    };

    [...files].sort(collator.compare).forEach((file) => {
      if (typeof file !== "string" || file.startsWith(".") || !imagePattern.test(file)) return;
      if (file.includes("/") || file.includes("\\")) return;
      const key = file.replace(imagePattern, "").replace(/-bw$/i, "").toLowerCase();
      if (retiredPhotos.has(key)) return;
      const saved = unique.get(key);
      if (!saved || priority(file) > priority(saved)) unique.set(key, file);
    });

    return [...unique.values()].sort(collator.compare);
  }

  function photoURL(file) {
    return new URL(encodeURIComponent(file), galleryURL).href;
  }

  function photoLabel(file) {
    const label = file
      .replace(imagePattern, "")
      .replace(/-bw$/i, "")
      .replace(/^tattoo[-_]?\d+[-_]?/i, "")
      .replace(/[-_]+/g, " ");
    return label || "Lavoro di Oreste Coscia";
  }

  function wrap(index) {
    return (index % photos.length + photos.length) % photos.length;
  }

  function canPlay() {
    return photos.length > 1 && inView && !document.hidden
      && !motion.matches && !keyboardFocus && !touchStart;
  }

  function schedule() {
    window.clearTimeout(timer);
    if (canPlay()) timer = window.setTimeout(() => move(1), interval);
  }

  function visiblePosition(position) {
    const before = Math.floor((Math.min(photos.length, 5) - 1) / 2);
    const after = Math.min(photos.length, 5) - before - 1;
    return position >= -before && position <= after;
  }

  function updateCard(card, position, updateImage = false) {
    const index = wrap(current + position);
    const image = card.querySelector("img");
    const visible = visiblePosition(position);
    card.dataset.position = String(position);
    card.classList.toggle("is-active", position === 0);
    card.classList.toggle("is-spare", !visible);
    card.setAttribute("aria-hidden", String(position !== 0));
    card.setAttribute("aria-label", `${index + 1} di ${photos.length}: ${photoLabel(photos[index])}`);

    if (updateImage) {
      image.src = photoURL(photos[index]);
      image.alt = `Foto di tatuaggi e piercing: ${photoLabel(photos[index])}`;
    }
  }

  function announce() {
    status.textContent = `Foto ${current + 1} di ${photos.length}: ${photoLabel(photos[current])}`;
  }

  function paint() {
    cards.forEach((card, index) => updateCard(card, index - 3, true));
  }

  function move(direction, manual = false) {
    if (animating || photos.length < 2) return;
    current = wrap(current + direction);
    animating = true;

    cards.forEach((card) => {
      let position = Number(card.dataset.position) - direction;
      const recycled = position < -3 || position > 3;
      if (recycled) {
        position = position < -3 ? 3 : -3;
        card.classList.add("is-resetting");
      }
      updateCard(card, position, recycled);
    });

    if (manual) announce();
    schedule();
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      cards.forEach((card) => card.classList.remove("is-resetting"));
      animating = false;
    }, motion.matches ? 0 : duration);
  }

  function setPhotos(files) {
    const updated = normalize(files);
    if (cards.length && JSON.stringify(updated) === JSON.stringify(photos)) return;
    const selected = photos[current];
    photos = updated;
    window.clearTimeout(transitionTimer);
    animating = false;
    cards.forEach((card) => card.classList.remove("is-resetting"));
    current = selected && photos.includes(selected)
      ? photos.indexOf(selected)
      : Math.min(2, Math.floor((photos.length - 1) / 2));

    if (!cards.length) {
      stage.replaceChildren();
      // Sette elementi riutilizzati: cinque visibili e due buffer fuori scena.
      for (let position = -3; position <= 3; position += 1) {
        const card = document.createElement("figure");
        const image = document.createElement("img");
        card.className = "gallery-card";
        card.setAttribute("role", "group");
        card.setAttribute("aria-roledescription", "diapositiva");
        image.width = 600;
        image.height = 800;
        image.decoding = "async";
        image.draggable = false;
        card.append(image);
        stage.append(card);
        cards.push(card);
      }
    }

    stage.hidden = !photos.length;
    previous.disabled = photos.length < 2;
    next.disabled = photos.length < 2;
    carousel.classList.toggle("is-empty", !photos.length);
    if (photos.length) paint();
    status.textContent = photos.length ? "" : "La galleria sarà disponibile a breve.";
    schedule();
  }

  previous.addEventListener("click", () => move(-1, true));
  next.addEventListener("click", () => move(1, true));

  carousel.addEventListener("keydown", (event) => {
    if (!photos.length) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") move(-1, true);
    if (event.key === "ArrowRight") move(1, true);
    if (event.key === "Home" || event.key === "End") {
      if (animating) return;
      current = event.key === "Home" ? 0 : photos.length - 1;
      paint();
      announce();
      schedule();
    }
  });

  // Il clic sulle frecce riavvia il conto di 5 s. La tastiera ferma l'autoplay.
  carousel.addEventListener("focusin", (event) => {
    keyboardFocus = event.target.matches(":focus-visible");
    schedule();
  });
  carousel.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    keyboardFocus = true;
    schedule();
  });
  carousel.addEventListener("pointerdown", () => {
    keyboardFocus = false;
    schedule();
  });
  carousel.addEventListener("focusout", (event) => {
    if (carousel.contains(event.relatedTarget)) return;
    keyboardFocus = false;
    schedule();
  });

  stage.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
    schedule();
  }, { passive: true });

  stage.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      move(dx < 0 ? 1 : -1, true);
    }
    schedule();
  }, { passive: true });

  stage.addEventListener("touchcancel", () => {
    touchStart = null;
    schedule();
  }, { passive: true });

  motion.addEventListener("change", schedule);
  document.addEventListener("visibilitychange", schedule);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    }, { threshold: 0.2 }).observe(carousel);
  } else {
    inView = true;
  }

  setPhotos(window.ORESTE_GALLERY || []);

  async function fetchResource(url, asJSON = true) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await (asJSON ? response.json() : response.text());
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function repository() {
    if (config.galleryRepository) return config.galleryRepository;
    if (!location.hostname.endsWith(".github.io")) return null;
    const owner = location.hostname.slice(0, -".github.io".length);
    const name = location.pathname.split("/").filter(Boolean)[0];
    return `${owner}/${name && !name.includes(".") ? name : `${owner}.github.io`}`;
  }

  async function discoverPhotos() {
    if (location.protocol === "file:") return;
    const repo = repository();

    try {
      if (!repo) {
        // In locale (es. python -m http.server) si legge l'indice della cartella.
        const html = await fetchResource(galleryURL, false);
        const documentIndex = new DOMParser().parseFromString(html, "text/html");
        const files = [...documentIndex.querySelectorAll("a[href]")].flatMap((link) => {
          const url = new URL(link.getAttribute("href"), galleryURL);
          if (url.origin !== galleryURL.origin || url.search || url.hash) return [];
          if (!url.pathname.startsWith(galleryURL.pathname)) return [];
          const name = decodeURIComponent(url.pathname.slice(galleryURL.pathname.length));
          return imagePattern.test(name) && !name.includes("/") ? [name] : [];
        });
        if (files.length || /Directory listing for|Index of/i.test(html)) setPhotos(files);
        return;
      }

      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return;
      const branch = config.galleryBranch || "main";
      const cacheKey = `oreste-gallery-v3:${repo}:${branch}`;
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        if (cached && Array.isArray(cached.files)) {
          setPhotos(cached.files);
          if (Date.now() - cached.time < 60000) return;
        }
      } catch {
        // Navigazione privata o cache non valida: continua senza cache.
      }

      const base = `https://api.github.com/repos/${repo}`;
      const entries = await fetchResource(`${base}/contents/assets/gallery?ref=${encodeURIComponent(branch)}`);
      if (!Array.isArray(entries)) throw new Error("Indice galleria non valido");
      let files = entries.filter((entry) => entry.type === "file").map((entry) => entry.name);

      // Contents si ferma a 1000 elementi; il tree della cartella evita quel limite.
      if (entries.length >= 1000) {
        let tree = await fetchResource(`${base}/git/trees/${encodeURIComponent(branch)}`);
        for (const folder of ["assets", "gallery"]) {
          const entry = tree.tree.find((item) => item.type === "tree" && item.path === folder);
          if (!entry) throw new Error("Cartella galleria non trovata");
          tree = await fetchResource(`${base}/git/trees/${entry.sha}`);
        }
        if (tree.truncated) throw new Error("Indice galleria incompleto");
        files = tree.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
      }

      setPhotos(files);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), files: photos }));
      } catch {
        // La cache è facoltativa.
      }
    } catch {
      // L'elenco incluso nel progetto resta disponibile anche senza rete/API.
    }
  }

  discoverPhotos();
})();
