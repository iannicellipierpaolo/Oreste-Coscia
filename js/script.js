(() => {
  "use strict";

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
;

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

})();
