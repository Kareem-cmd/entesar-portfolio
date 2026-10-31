/* ============================================================
   ENTESAR · main — intro orchestration (Lenis + GSAP + WebGL cat)
   ============================================================ */
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { CatScene } from "./webgl/cat.js";
import { initHUD } from "./hud.js";


gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* — Smooth scroll — */
let lenis;
if (!reduced) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* — WebGL cat — */
let cat = null;
const webgl = document.querySelector("#webgl");
try {
  if (reduced) throw new Error("Static scene selected for reduced motion");
  cat = new CatScene(webgl, "assets/cat/cat-a.jpg");
  cat.onReady(() => document.documentElement.classList.add("webgl-ready"));
  // only run the (expensive) WebGL loop while the hero is actually on screen
  let heroOnScreen = true;
  const heroEl = document.querySelector(".hero");
  if (heroEl && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; }, { threshold: 0 }).observe(heroEl);
  }
  gsap.ticker.add((time) => { if (heroOnScreen && !document.hidden) cat.render(time); });
  cat.uReveal.value = 1;
  if (!reduced) {
    // start zoomed deep into the right eye, ready to pull back
    cat.uScale.value = 0.18;
    cat.uOffset.value = [0.14, -0.02];
  }
} catch (err) {
  console.warn("WebGL cat unavailable:", err);
  document.documentElement.classList.add("no-webgl");
}

/* — Intro: preloader counter → cat assembles from the dark → HUD — */
const pre = document.querySelector("#preloader");
const counter = pre ? pre.querySelector(".count") : null;
let introRan = false;

function runIntro() {
  if (introRan || window.__introExpired) return;
  introRan = true;
  document.documentElement.classList.add("intro-running");
  setTimeout(() => document.documentElement.classList.remove("intro-running"), 2500);

  const tl = gsap.timeline();
  const o = { v: 0 };

  // cycling loader messages (à la yutaabe's "MEOW MEOW")
  const msgEl = pre ? pre.querySelector(".preloader__msg") : null;
  const MSGS = ["Begins in the dark", "Sharpening the gaze", "Femme fatale", "Designed by instinct"];
  let mi = 0;
  const msgTimer = (!reduced && msgEl)
    ? setInterval(() => { mi = (mi + 1) % MSGS.length; msgEl.textContent = MSGS[mi]; }, 520)
    : null;

  // 1 — count up in the dark
  tl.to(o, {
    v: 100,
    duration: reduced ? 0 : 0.65,
    ease: "power1.inOut",
    onUpdate: () => { if (counter) counter.textContent = String(Math.round(o.v)).padStart(3, "0"); },
  });

  // 2 — the dark lifts to an extreme close-up of the glowing eye
  tl.to(pre, {
    autoAlpha: 0, duration: 0.9, ease: "power2.inOut",
    onStart: () => { if (msgTimer) clearInterval(msgTimer); },
  }, reduced ? ">" : "-=0.25");

  // 3 — pull back from the eye to reveal the whole cat
  if (cat && !reduced) {
    tl.to(cat.uScale, { value: 1.04, duration: 1.5, ease: "power3.inOut" }, "-=0.5");
    tl.to(cat.uOffset.value, { 0: 0.0, 1: 0.0, duration: 1.5, ease: "power3.inOut" }, "<");
  }

  // 4 — HUD settles in
  tl.from(".hud [data-hud], .hero__scroll", {
    autoAlpha: 0, yPercent: 40, stagger: 0.08, duration: 0.9, ease: "expo.out",
  }, reduced ? ">" : "-=1.5");
}

// only start the intro once the page is actually visible, so it never
// "jumps" past the animation when the tab loaded in the background.
function whenVisible(fn) {
  if (document.visibilityState === "visible") return fn();
  const onVis = () => {
    if (document.visibilityState === "visible") {
      document.removeEventListener("visibilitychange", onVis);
      fn();
    }
  };
  document.addEventListener("visibilitychange", onVis);
}

if (cat) {
  const trigger = () => whenVisible(runIntro);
  cat.onReady(() => { document.documentElement.classList.add("webgl-ready"); trigger(); });
  setTimeout(trigger, 1800); // safety net if the load event is missed
} else {
  if (pre) gsap.to(pre, { autoAlpha: 0, duration: 0.6 });
}

/* — Scroll reveals (outside the hero) — */
gsap.utils.toArray("[data-reveal]").forEach((el) => {
  if (reduced || el.closest(".hero")) return;
  gsap.from(el, {
    yPercent: 12, autoAlpha: 0, duration: 1.1, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 88%" },
  });
});

/* — Fade the cat out as the hero leaves — */
if (cat && !reduced) {
  gsap.to(webgl, {
    autoAlpha: 0, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "55% top", end: "bottom top", scrub: true },
  });
}

/* Native cursor stays visible independently of animation and modal layers. */

/* — HUD: live clock, weather, scramble status, stare toggle — */
initHUD(cat);

/* — Projects: folder-based holographic case studies — */


/* — dev handle (lets tooling freeze motion for clean captures) — */
window.__E = { gsap, ScrollTrigger, lenis, cat };
window.__freeze = () => {
  gsap.globalTimeline.pause();
  try { lenis && lenis.destroy(); } catch (e) {}
  gsap.ticker.sleep();
};

document.documentElement.classList.add("is-ready");
console.log("%cEntesar · intro online", "color:#83a98d", "— GSAP " + gsap.version);
