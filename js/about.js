/* ============================================================
   ENTESAR · About — scramble-decode, smooth scroll, reveals, cursor
   Self-contained. Mirrors the site's motion conventions (main.js).
   ============================================================ */
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* gate the page-load fade until JS is alive */
root.classList.add("about-loading");

/* ============================================================
   Scramble-decode utility
   Resolves random A–Z / # / 0–9 glyphs into the final string.
   Honours data-final; restores it exactly on completion.
   ============================================================ */
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+·0123456789";

function scrambleTo(el, { duration = 1500, delay = 0 } = {}) {
  const final = el.dataset.final ?? el.textContent.trim();
  const len = final.length;

  // reduced motion / no length: just set the text, no animation
  if (reduced || !len) {
    el.textContent = final;
    el.classList.remove("is-scrambling");
    return Promise.resolve();
  }

  el.classList.add("is-scrambling");

  return new Promise((resolve) => {
    const start = performance.now() + delay;
    let raf = 0;

    const frame = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      // how many leading chars have locked in
      const locked = Math.floor(t * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = final[i];
        if (ch === " ") { out += " "; continue; }
        if (i < locked) out += ch;
        else out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }
      el.textContent = out;

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        el.textContent = final;
        el.classList.remove("is-scrambling");
        cancelAnimationFrame(raf);
        resolve();
      }
    };

    raf = requestAnimationFrame(frame);
  });
}

/* ============================================================
   Smooth scroll (Lenis) — wired to gsap.ticker + ScrollTrigger
   ============================================================ */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // intercept in-page hash links so the scroll cue uses Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
    });
  });
}

/* ============================================================
   Intro — page fade-in + hero scramble-decode
   ============================================================ */
function runIntro() {
  // lift the page-load veil
  root.classList.remove("about-loading");

  const heroLines = gsap.utils.toArray(".hero__name [data-scramble]");
  const hudCode = document.querySelector(".hero__hud-code[data-scramble]");

  if (reduced) {
    // set everything to final immediately
    heroLines.forEach((el) => { el.textContent = el.dataset.final ?? el.textContent; });
    if (hudCode) hudCode.textContent = hudCode.dataset.final ?? hudCode.textContent;
    revealHeroChrome(true);
    return;
  }

  // hero eyebrow + scroll cue + eye drift in
  revealHeroChrome(false);

  // names decode, line two trailing the first
  heroLines.forEach((el, i) => scrambleTo(el, { duration: 1500, delay: i * 220 }));
  // HUD code decodes a touch later, slower — like a terminal settling
  if (hudCode) scrambleTo(hudCode, { duration: 1700, delay: 650 });
}

function revealHeroChrome(instant) {
  const bits = [".hero__eyebrow", ".hero__hud", ".hero__scroll"].flatMap((s) =>
    gsap.utils.toArray(s)
  );
  if (instant || reduced) {
    gsap.set(bits, { autoAlpha: 1, y: 0 });
    gsap.set(".hero__eye", { autoAlpha: 1 });
    return;
  }
  gsap.set(bits, { autoAlpha: 0, y: 18 });
  gsap.from(".hero__eye", { autoAlpha: 0, scale: 1.08, duration: 2.4, ease: "power2.out" });
  gsap.to(bits, {
    autoAlpha: 1,
    y: 0,
    duration: 1,
    ease: "expo.out",
    stagger: 0.12,
    delay: 0.45,
  });
}

/* run intro only when the page is actually visible (no background jump) */
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
whenVisible(runIntro);

/* ============================================================
   Scroll reveals — every [data-reveal] outside the hero
   ============================================================ */
if (reduced) {
  gsap.set("[data-reveal]", { autoAlpha: 1, y: 0 });
} else {
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    if (el.closest(".hero")) { gsap.set(el, { autoAlpha: 1 }); return; }
    gsap.from(el, {
      yPercent: 14,
      autoAlpha: 0,
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });
}

/* ============================================================
   Custom cursor — the pupil that watches (hover + fine pointer only)
   ============================================================ */
/* ============================================================
   Refresh ScrollTrigger after fonts load (layout shift safety)
   ============================================================ */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

root.classList.add("is-ready");
console.log("%cEntesar · about online", "color:#83a98d", "— GSAP " + gsap.version);
