(() => {
  "use strict";

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const config = window.ORESTE_CONFIG || {};
  const header = document.querySelector(".header");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".nav");

  // I recapiti sono in config.js: nessun dato viene generato o dedotto.
  document.querySelectorAll("[data-contact]").forEach((link) => {
    const key = link.dataset.contact;
    if (!config[key]) return;
    link.href = key === "phone" ? `tel:${config.phone}` : config[key];
    if (link.classList.contains("phone")) {
      link.textContent = config.phoneDisplay;
    }
  });

  if (config.email) {
    const placeholder = document.querySelector("[data-email-placeholder]");
    const email = document.createElement("a");
    email.href = `mailto:${config.email}`;
    email.textContent = config.email;
    placeholder.replaceWith(email);
  }

  if (config.facebook) {
    const placeholder = document.querySelector(".facebook-placeholder");
    const facebook = document.createElement("a");
    facebook.className = "mono";
    facebook.href = config.facebook;
    facebook.target = "_blank";
    facebook.rel = "noopener noreferrer";
    facebook.textContent = "FACEBOOK ↗";
    placeholder.replaceWith(facebook);
  }

  function closeMenu() {
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Apri menu");
  }

  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    navigation.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
  document.querySelector(".booking").addEventListener("click", closeMenu);
  document.querySelector(".brand").addEventListener("click", closeMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navigation.classList.contains("is-open")) {
      closeMenu();
      menuButton.focus();
    }
    if (event.key === "Tab" && navigation.classList.contains("is-open")) {
      const focusable = [...header.querySelectorAll("a, button")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 30);
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navigation.querySelectorAll("a").forEach((link) => {
          if (link.hash === `#${entry.target.id}`) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    }, { rootMargin: "-25% 0px -50% 0px" });
    document.querySelectorAll("main > section").forEach((section) => {
      sectionObserver.observe(section);
    });
  }

  // Carosello accessibile: loop, pausa esplicita, hover, focus e swipe.
  const carousel = document.querySelector(".carousel");
  const slides = [...carousel.querySelectorAll(".slide")];
  const counter = document.querySelector("#slide-number");
  const status = document.querySelector("#carousel-status");
  const toggle = document.querySelector(".autoplay-toggle");
  const progress = document.querySelector(".carousel-progress > span");
  const labels = ["Ritratto", "Tigre", "Ornamentale", "Serpente", "Farfalla e lettering"];
  const interval = 4000;
  let current = 0;
  let userPaused = motionQuery.matches;
  let hovering = false;
  let focusWithin = false;
  let inView = false;
  let timer = null;

  function canPlay() {
    return !userPaused && !hovering && !focusWithin && inView
      && !document.hidden && !motionQuery.matches;
  }

  function schedule() {
    window.clearTimeout(timer);
    progress.style.transition = "none";
    progress.style.transform = "scaleX(0)";
    if (!canPlay()) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!canPlay()) return;
        progress.style.transition = `transform ${interval}ms linear`;
        progress.style.transform = "scaleX(1)";
      });
    });
    timer = window.setTimeout(() => goTo(current + 1), interval);
  }

  function goTo(index, manual = false) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      let position = (slideIndex - current + slides.length) % slides.length;
      if (position > 2) position -= slides.length;
      slide.dataset.position = position;
      slide.classList.toggle("is-active", position === 0);
      slide.setAttribute("aria-hidden", String(position !== 0));
    });
    counter.textContent = String(current + 1).padStart(2, "0");
    if (manual) {
      status.textContent = `Tatuaggio ${current + 1} di 5: ${labels[current]}`;
    }
    schedule();
  }

  carousel.querySelector(".prev").addEventListener("click", () => goTo(current - 1, true));
  carousel.querySelector(".next").addEventListener("click", () => goTo(current + 1, true));
  carousel.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") goTo(current - 1, true);
    if (event.key === "ArrowRight") goTo(current + 1, true);
    if (event.key === "Home") goTo(0, true);
    if (event.key === "End") goTo(slides.length - 1, true);
  });

  carousel.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovering = true;
    schedule();
  });
  carousel.addEventListener("pointerleave", () => {
    hovering = false;
    schedule();
  });
  carousel.addEventListener("focusin", () => {
    focusWithin = true;
    schedule();
  });
  carousel.addEventListener("focusout", (event) => {
    if (carousel.contains(event.relatedTarget)) return;
    focusWithin = false;
    schedule();
  });

  let touchStart = null;
  carousel.addEventListener("touchstart", (event) => {
    touchStart = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    };
  }, { passive: true });
  carousel.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      goTo(current + (dx < 0 ? 1 : -1), true);
    }
    touchStart = null;
  }, { passive: true });

  function updateToggle() {
    toggle.hidden = motionQuery.matches;
    const paused = userPaused || motionQuery.matches;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Avvia il carosello" : "Metti in pausa il carosello");
    toggle.innerHTML = paused ? 'AVVIA <span aria-hidden="true">▷</span>' : 'PAUSA <span aria-hidden="true">Ⅱ</span>';
  }

  toggle.addEventListener("click", () => {
    if (motionQuery.matches) {
      goTo(current + 1, true);
      return;
    }
    userPaused = !userPaused;
    updateToggle();
    schedule();
  });
  motionQuery.addEventListener("change", () => {
    userPaused = motionQuery.matches;
    updateToggle();
    schedule();
  });
  document.addEventListener("visibilitychange", schedule);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0.2 }).observe(carousel);
  } else {
    inView = true;
    schedule();
  }
  updateToggle();
  goTo(0);

  // Dialogo nativo: focus contenuto, chiusura con Escape e ritorno al trigger.
  const dialog = document.querySelector(".credits-dialog");
  const creditsButton = document.querySelector(".credits-toggle");
  creditsButton.addEventListener("click", () => {
    dialog.showModal();
    document.body.classList.add("dialog-open");
  });
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right
      || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
    creditsButton.focus({ preventScroll: true });
  });

  // La pagina resta visibile e navigabile anche senza GSAP o ScrollTrigger.
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const motion = gsap.matchMedia();

  motion.add("(prefers-reduced-motion: no-preference)", () => {
    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
    intro.from(".brand", { y: -12, opacity: 0, duration: 0.6 })
      .from(".hero-since", { opacity: 0, duration: 0.65 }, 0.15)
      .from(".hero h1 > span:first-child", { x: -45, opacity: 0, duration: 1 }, 0.15)
      .from(".hero h1 > span:last-child", { x: 45, opacity: 0, duration: 1 }, 0.25)
      .from(".hero-subtitle, .services", { y: 15, opacity: 0, stagger: 0.12, duration: 0.7 }, 0.5)
      .from(".hero-art", { y: 40, opacity: 0, duration: 1.4 }, 0.1)
      .from(".hero-ring", { scale: 0.8, opacity: 0, duration: 1.4 }, 0.3)
      .from(".eye-flash", { scaleX: 0, transformOrigin: "left", duration: 0.35 }, 0.8)
      .fromTo(".eye-flash", { opacity: 0.1 }, { opacity: 1, repeat: 2, yoyo: true, duration: 0.08 }, 1.15);

    document.querySelectorAll("[data-reveal]").forEach((element) => {
      if (element.dataset.reveal === "image") {
  const photo = element.querySelector("img");

  const photoReveal = gsap.timeline({
    scrollTrigger: {
      trigger: element,
      start: "top 85%",
      once: true
    }
  });

  photoReveal.fromTo(
    element,
    {
      autoAlpha: 0,
      y: 40,
      clipPath: "inset(12% 0% 0% 0%)"
    },
    {
      autoAlpha: 1,
      y: 0,
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 1.15,
      ease: "power3.out"
    },
    0
  );

  photoReveal.fromTo(
    photo,
    {
      scale: 1.12
    },
    {
      scale: 1,
      duration: 1.65,
      ease: "power2.out"
    },
    0
  );
} else {
        gsap.from(element, {
          y: 24,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 91%", once: true }
        });
      }
    });

    return () => gsap.set("[data-reveal]", { clearProps: "all" });
  });

  motion.add("(min-width: 1000px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
    const statue = document.querySelector(".statue-motion");
    const hero = document.querySelector(".hero");
    const moveX = gsap.quickTo(statue, "x", { duration: 0.9, ease: "power2.out" });
    const moveY = gsap.quickTo(statue, "y", { duration: 0.9, ease: "power2.out" });
    function parallax(event) {
      const bounds = hero.getBoundingClientRect();
      moveX((event.clientX / window.innerWidth - 0.5) * 13);
      moveY(((event.clientY - bounds.top) / bounds.height - 0.5) * 9);
    }
    function reset() {
      moveX(0);
      moveY(0);
    }
    hero.addEventListener("pointermove", parallax);
    hero.addEventListener("pointerleave", reset);
    return () => {
      hero.removeEventListener("pointermove", parallax);
      hero.removeEventListener("pointerleave", reset);
      gsap.set(statue, { clearProps: "transform" });
    };
  });
})();
