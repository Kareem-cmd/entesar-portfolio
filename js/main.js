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

/* Logo loading is handled independently by site.js. */
let introRan = false;
function runIntro() {
 if (introRan) return;
 if (document.documentElement.classList.contains('logo-loading')) {
  document.addEventListener('entesar:ready', runIntro, {once:true}); return;
 }
 introRan=true;
 if(cat && !reduced) {
  gsap.to(cat.uScale,{value:1.04,duration:1.5,ease:'power3.inOut'});
  gsap.to(cat.uOffset.value,{0:0,1:0,duration:1.5,ease:'power3.inOut'});
 }
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
