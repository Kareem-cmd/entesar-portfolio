/* ============================================================
   ENTESAR · Playground
   Masonry archive · Lenis smooth-scroll · GSAP reveals
   feline noir. Designed by instinct.
   ============================================================ */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE     = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const $  = (s, c = document) => c.querySelector(s);

const grid     = $('[data-grid]');
const pgRoot   = $('.pg');
const countEl  = $('[data-count]');

/* ------------------------------------------------------------
   1 · Data — fetch manifest, flatten + round-robin interleave
   ------------------------------------------------------------ */
async function loadImages() {
  const res = await fetch('assets/projects/manifest.json?v=projects-3');
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  const projects = await res.json();

  // build per-project queues of {src, name, cat}
  const queues = projects.map((p) =>
    (p.images || []).map((src) => ({ src, name: p.name, cat: p.cat, slug: p.slug, size: p.dimensions?.[src] }))
  );

  // round-robin: take one from each project per pass so columns stay varied
  const flat = [];
  const max = Math.max(0, ...queues.map((q) => q.length));
  for (let i = 0; i < max; i++) {
    for (const q of queues) {
      if (i < q.length) flat.push(q[i]);
    }
  }
  return flat;
}

/* ------------------------------------------------------------
   2 · Build masonry as explicit, staggered columns
   ------------------------------------------------------------ */
let COLS = [];
const PARALLAX = [0, 0.028, -0.022, 0.04]; // subtle per-column scroll drift

function colCount() {
  const w = window.innerWidth;
  if (w >= 1200) return 4;
  if (w >= 760) return 3;
  return 2; // keep the staggered multi-column look on phones too
}

function buildGrid(items) {
  const n = colCount();
  grid.innerHTML = '';
  COLS = [];
  for (let c = 0; c < n; c++) {
    const col = document.createElement('div');
    col.className = 'pg__col';
    grid.appendChild(col);
    COLS.push(col);
  }
  items.forEach((it, i) => {
    const fig = document.createElement('figure');
    fig.className = 'pg__item';

    const img = document.createElement('img');
    if (it.size) { img.width = it.size[0]; img.height = it.size[1]; }
    img.src = it.src;
    img.alt = `${it.name} — visual ${String(i + 1).padStart(3, '0')}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

    const tag = document.createElement('figcaption');
    tag.className = 'pg__item-tag';
    tag.textContent = it.name;

    const link = document.createElement('a');
    link.href = `projects/${it.slug}.html`;
    link.append(img);
    fig.append(link, tag);
    COLS[i % n].appendChild(fig);
  });
  return Array.from(grid.querySelectorAll('.pg__item'));
}

/* columns drift at slightly different rates as you scroll (the flowing feel) */
function applyParallax(scroll) {
  for (let i = 0; i < COLS.length; i++) {
    const dy = -scroll * (PARALLAX[i] || 0);
    COLS[i].style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0)`;
  }
}

/* ------------------------------------------------------------
   3 · Smooth scroll (Lenis) wired to GSAP ticker
   ------------------------------------------------------------ */
function initLenis() {
  if (REDUCED) return null;
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/* ------------------------------------------------------------
   4 · Scroll reveals — ScrollTrigger.batch (perf for 144 items)
   ------------------------------------------------------------ */
function initReveals(items) {
  if (REDUCED) {
    gsap.set(items, { autoAlpha: 1 });
    return;
  }
  gsap.set(items, { autoAlpha: 0, yPercent: 8, scale: 0.98 });

  ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    batchMax: 8,
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        yPercent: 0,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.06,
        overwrite: true,
      }),
  });
}

/* ------------------------------------------------------------
   5 · Hover focus — focus one, dim the rest
   ------------------------------------------------------------ */
function initHoverFocus(items) {
  if (!FINE) return;
  items.forEach((item) => {
    item.addEventListener('pointerenter', () => {
      item.classList.add('is-focus');
      grid.classList.add('is-dim');
    });
    item.addEventListener('pointerleave', () => {
      item.classList.remove('is-focus');
      grid.classList.remove('is-dim');
    });
  });
}

/* ------------------------------------------------------------
   6 · Custom cursor — quickTo follower
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   7 · Scramble HUD — resolves to DESIGNED BY INSTINCT
   ------------------------------------------------------------ */
function initScramble() {
  const el = $('[data-scramble]');
  if (!el || REDUCED) return;

  const FINAL = 'DESIGNED BY INSTINCT';
  const GLYPHS = '#@%&*+=<>/\\|·:';
  let raf = null;

  function run() {
    let frame = 0;
    const total = 22;
    cancelAnimationFrame(raf);

    const tick = () => {
      const progress = frame / total;
      const out = FINAL.split('')
        .map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i / FINAL.length < progress) return ch;
          return GLYPHS[(Math.random() * GLYPHS.length) | 0];
        })
        .join('');
      el.textContent = out;
      frame++;
      if (frame <= total) {
        raf = requestAnimationFrame(tick);
      } else {
        el.textContent = FINAL;
      }
    };
    tick();
  }

  // resolve once on load, then re-scramble periodically
  run();
  setInterval(run, 6000);
}

/* ------------------------------------------------------------
   8 · Boot
   ------------------------------------------------------------ */
async function boot() {
  // cursor + scramble can start immediately

  initScramble();

  const lenis = initLenis();

  let items = [];
  let IMAGES = [];
  try {
    IMAGES = await loadImages();
    if (countEl) {
      countEl.textContent = `${IMAGES.length} frames · ${new Set(IMAGES.map((i) => i.name)).size} worlds`;
    }
    items = buildGrid(IMAGES);
  } catch (err) {
    console.warn('[playground] archive failed to load:', err);
    // Keep the server-rendered archive available when the enhancement fails.
    grid.classList.add('archive-static');
  }

  // page-load fade in — add directly so visibility never depends on a
  // frame tick (rAF is paused in background tabs; the CSS transition still runs)
  if (pgRoot) pgRoot.classList.add('is-ready');

  if (items.length) {
    initReveals(items);
    initHoverFocus(items);
    ScrollTrigger.refresh();

    // columns drift at slightly different rates + a touch of motion blur on fast scroll
    if (lenis && !REDUCED) {
      let fastT;
      lenis.on('scroll', (e) => {
        applyParallax(e.scroll || 0);
        if (FINE && Math.abs(e.velocity || 0) > 14) {
          grid.classList.add('is-fast');
          clearTimeout(fastT);
          fastT = setTimeout(() => grid.classList.remove('is-fast'), 110);
        }
      });
    }

    // rebuild only when the responsive column count actually changes
    let rT, curCols = COLS.length;
    window.addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        if (colCount() === curCols) { ScrollTrigger.refresh(); return; }
        ScrollTrigger.getAll().forEach((t) => t.kill());
        items = buildGrid(IMAGES);
        curCols = COLS.length;
        initReveals(items);
        initHoverFocus(items);
        ScrollTrigger.refresh();
      }, 250);
    });
  }

  // keep Lenis alive in scope (avoid GC of ticker binding)
  window.__pgLenis = lenis;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
