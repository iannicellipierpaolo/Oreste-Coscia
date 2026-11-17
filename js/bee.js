/* Traiettoria in coordinate della pagina; solo il Group esterno si sposta. */
const settings = {
  model: "assets/bee/Oreste_Ape_Neon.glb",
  scrub: 0.6,
  mobileDPR: 1.35,
  desktopDPR: 1.7
};

document.querySelectorAll(".bee-still").forEach((image) => {
  image.src = settings.model.replace(/\.glb$/i, "_Fallback.webp");
});

const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let disposeScene = null;
let generation = 0;

async function startBee() {
  const request = ++generation;
  disposeScene?.();
  disposeScene = null;
  document.documentElement.classList.remove("bee-ready");
  if (motionQuery.matches || !window.gsap || !window.ScrollTrigger) return;

  let renderer;
  try {
    const THREE = await import("three");
    const { GLTFLoader } = await import(
      "./vendor/three/examples/jsm/loaders/GLTFLoader.js"
    );
    if (request !== generation) return;

    const canvas = document.querySelector("#bee-canvas");
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "default"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10000);
    camera.position.z = 5000;
    const flight = new THREE.Group();
    flight.name = "BeeFlightPath";
    scene.add(flight);

    // Pannelli neutri: riflessi morbidi leggibili sui materiali neri originali.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0.09, 0.09, 0.09);
    const panels = [
      [-3, 3, 4, 5, 5, 6],
      [3, 4, -2, 3, 5, 5],
      [0, -2, 3, 4, 1, 2]
    ];
    panels.forEach(([x, y, z, w, h, intensity]) => {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setScalar(intensity),
          side: THREE.DoubleSide
        })
      );
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, 0.08);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.8;
    pmrem.dispose();
    studio.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    const key = new THREE.DirectionalLight(0xf5f5ef, 2);
    key.position.set(-3, 4, 6);
    const rim = new THREE.DirectionalLight(0xe7edf3, 1.8);
    rim.position.set(3, 4, -3);
    scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x202020, 0.55));

    let mixer;
    let gltf;
    let tween;
    let resizeFrame = 0;
    let observer;
    let stopped = false;
    let lastTime = 0;
    let width = 1;
    let height = 1;
    let nodes = [];
    const state = { scroll: window.scrollY };
    const orientation = new THREE.Euler(0, 0, 0, "YXZ");

    function release() {
      if (stopped) return;
      stopped = true;
      renderer.setAnimationLoop(null);
      tween?.kill();
      tween?.scrollTrigger?.kill();
      observer?.disconnect();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      window.ScrollTrigger.removeEventListener("refreshInit", measure);
      mixer?.stopAllAction();
      if (gltf) mixer?.uncacheRoot(gltf.scene);
      const textures = new Set();
      scene.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material)
          ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value?.isTexture) textures.add(value);
          });
          material.dispose();
        });
      });
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      renderer.dispose();
      document.documentElement.classList.remove("bee-ready");
    }
    disposeScene = release;

    function contextLost(event) {
      event.preventDefault();
      release();
    }
    canvas.addEventListener("webglcontextlost", contextLost);

    function box(name) {
      const element = document.querySelector(`[data-bee-anchor="${name}"]`);
      // offset* ignora le trasformazioni GSAP applicate durante i reveal.
      let x = element.offsetWidth / 2;
      let y = element.offsetHeight / 2;
      for (let parent = element; parent; parent = parent.offsetParent) {
        x += parent.offsetLeft;
        y += parent.offsetTop;
      }
      return { x, y, size: Math.min(element.offsetWidth, element.offsetHeight) };
    }

    function measure() {
      width = document.documentElement.clientWidth;
      height = window.innerHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1,
        width <= 760 ? settings.mobileDPR : settings.desktopDPR));
      renderer.setSize(width, height, false);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      const home = box("home");
      const artist = box("artist");
      const worksA = box("works-start");
      const worksB = box("works-end");
      const contact = box("contact");
      const at = (anchor) => Math.max(0, anchor.y - height * 0.48);
      const artistStop = at(artist);
      const worksStart = Math.max(artistStop + 180, at(worksA));
      const worksEnd = worksStart + Math.min(200, height * 0.25);
      const contactStop = Math.max(worksEnd + 200, at(contact));
      const edge = width - (width <= 760 ? 16 : 45);
      // [scroll, x, y, ingombro, rotazione X/Y/Z, posa]
      nodes = [
        [0, home.x, home.y, home.size * 0.96, 0.42, -0.9, -0.16, 0],
        [artistStop * 0.58, edge, artist.y - 180, width <= 760 ? 28 : 70, 0.25, -1.4, -0.3, 0],
        [Math.max(1, artistStop - 100), artist.x, artist.y - 12, artist.size, 0.3, -1.05, -0.1, 0],
        [artistStop, artist.x, artist.y, artist.size, 0.3, -1.05, 0, 1],
        [artistStop + 80, artist.x, artist.y, artist.size, 0.3, -1.05, 0, 1],
        [artistStop + 170, edge, artist.y + 90, width <= 760 ? 28 : 70, 0.45, -0.6, -0.2, 0],
        [worksStart, worksB.x, worksB.y, worksB.size, 0.35, -1.2, 0.1, 0],
        [worksEnd, worksA.x, worksA.y, worksA.size, 0.4, 0.8, -0.1, 0],
        [worksEnd + (contactStop - worksEnd) * 0.52,
          edge, (worksA.y + contact.y) / 2, width <= 760 ? 28 : 70,
          0.3, -0.8, -0.2, 0],
        [contactStop - 110, contact.x, contact.y - 15, contact.size, 0.3, -1.05, -0.08, 0],
        [contactStop, contact.x, contact.y, contact.size, 0.3, -1.05, 0, 1],
        [Math.max(contactStop + 1, document.documentElement.scrollHeight - height),
          contact.x, contact.y, contact.size, 0.3, -1.05, 0, 1]
      ];
    }

    function scheduleMeasure() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => window.ScrollTrigger.refresh());
    }

    // Hermite con tangenti azzerate sulle soste: curve continue e posa stabile.
    function sample(scroll) {
      let index = 0;
      while (index < nodes.length - 2 && scroll > nodes[index + 1][0]) index++;
      const a = nodes[index];
      const b = nodes[index + 1];
      const t = THREE.MathUtils.clamp((scroll - a[0]) / (b[0] - a[0]), 0, 1);
      const smooth = t * t * (3 - 2 * t);
      const previous = nodes[Math.max(0, index - 1)];
      const next = nodes[Math.min(nodes.length - 1, index + 2)];
      const values = a.map((value, column) => {
        if (column === 0) return scroll;
        if (column >= 3) return THREE.MathUtils.lerp(value, b[column], smooth);
        const m0 = a[7] === 1 ? 0 : (b[column] - previous[column]) * 0.35;
        const m1 = b[7] === 1 ? 0 : (next[column] - value) * 0.35;
        return (2 * t ** 3 - 3 * t ** 2 + 1) * value
          + (t ** 3 - 2 * t ** 2 + t) * m0
          + (-2 * t ** 3 + 3 * t ** 2) * b[column]
          + (t ** 3 - t ** 2) * m1;
      });
      return values;
    }

    gltf = await new GLTFLoader().loadAsync(settings.model);
    if (stopped || request !== generation) {
      gltf.scene.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material)
          ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          Object.values(material).forEach((value) => value?.isTexture && value.dispose());
          material.dispose();
        });
      });
      return;
    }
    flight.add(gltf.scene);
    const modelBounds = new THREE.Box3().setFromObject(gltf.scene);
    const modelSize = modelBounds.getSize(new THREE.Vector3());
    const extent = Math.max(modelSize.x, modelSize.y, modelSize.z);
    mixer = new THREE.AnimationMixer(gltf.scene);
    const action = (name) => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (!clip) throw new Error(`Animazione assente: ${name}`);
      return mixer.clipAction(clip);
    };
    const wingbeat = action("Wingbeat").setLoop(THREE.LoopRepeat, Infinity).play();
    const hover = action("Hover").setLoop(THREE.LoopRepeat, Infinity).play();
    const land = action("Land").setLoop(THREE.LoopOnce, 1).play();
    land.clampWhenFinished = true;
    land.paused = true;
    land.setEffectiveWeight(0);

    function render(time) {
      if (stopped || !nodes.length) return;
      const delta = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
      lastTime = time;
      const [, x, y, size, rx, ry, rz, landed] = sample(state.scroll);
      const scale = size / (extent * 1.12);
      flight.position.set(x - width / 2, height / 2 - (y - window.scrollY), 0);
      flight.scale.setScalar(scale);
      flight.quaternion.setFromEuler(orientation.set(rx, ry, rz));
      land.time = land.getClip().duration * landed;
      land.setEffectiveWeight(landed);
      wingbeat.setEffectiveWeight(1 - landed);
      hover.setEffectiveWeight(1 - landed);
      mixer.update(delta);
      renderer.render(scene, camera);
    }

    function visibility() {
      lastTime = 0;
      renderer.setAnimationLoop(document.hidden ? null : render);
    }
    window.gsap.registerPlugin(window.ScrollTrigger);
    measure();
    tween = window.gsap.fromTo(state, { scroll: 0 }, {
      scroll: () => window.ScrollTrigger.maxScroll(window),
      ease: "none",
      immediateRender: false,
      scrollTrigger: {
        id: "bee-flight",
        start: 0,
        end: () => window.ScrollTrigger.maxScroll(window),
        scrub: settings.scrub,
        invalidateOnRefresh: true
      }
    });
    tween.scrollTrigger.refresh();
    // Accessi diretti a un'ancora non devono partire visivamente dalla home.
    tween.progress(window.scrollY / Math.max(1, window.ScrollTrigger.maxScroll(window)));
    window.ScrollTrigger.addEventListener("refreshInit", measure);
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleMeasure, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    observer = new ResizeObserver(scheduleMeasure);
    observer.observe(document.querySelector("main"));
    document.fonts.ready.then(() => !stopped && scheduleMeasure());
    render(0);
    document.documentElement.classList.add("bee-ready");
    visibility();
  } catch (error) {
    console.warn("Ape 3D: disponibile la versione statica.", error);
    if (request === generation) disposeScene?.();
    renderer?.dispose();
    document.documentElement.classList.remove("bee-ready");
  }
}

motionQuery.addEventListener("change", startBee);
window.addEventListener("load", startBee, { once: true });
