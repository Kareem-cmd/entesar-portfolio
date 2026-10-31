/* ============================================================
   ENTESAR · HUD — live clock, weather, scramble status, stare toggle
   ============================================================ */
import gsap from "gsap";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+·0123456789";

function wmo(c) {
  if (c === 0) return "Clear";
  if (c <= 3) return "Partly cloudy";
  if (c === 45 || c === 48) return "Fog";
  if (c <= 57) return "Drizzle";
  if (c <= 67) return "Rain";
  if (c <= 77) return "Snow";
  if (c <= 82) return "Showers";
  if (c <= 86) return "Snow showers";
  return "Storm";
}

function scramble(el) {
  const final = el.dataset.final || el.textContent.trim();
  const len = final.length;
  let f = 0;
  const total = len * 2 + 12;
  const id = setInterval(() => {
    let out = "";
    for (let i = 0; i < len; i++) {
      if (final[i] === " ") { out += " "; continue; }
      if (i < (f - 8) / 2) out += final[i];
      else out += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    el.textContent = out;
    if (++f > total) { clearInterval(id); el.textContent = final; }
  }, 30);
}

export function initHUD(cat) {
  // — live clock —
  const clockEl = document.getElementById("hud-clock");
  const placeEl = document.getElementById("hud-place");
  const tick = () => {
    if (!clockEl) return;
    clockEl.textContent = new Intl.DateTimeFormat("en", {timeZone:"Africa/Cairo",hour:"2-digit",minute:"2-digit"}).format(new Date());
  };
  tick();
  setInterval(tick, 5000);

  if (placeEl) placeEl.textContent = "Cairo · Egypt";

  // — weather (Cairo, open-meteo, no key) —
  const wEl = document.getElementById("hud-weather");
  if (wEl) {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=30.04&longitude=31.24&current=temperature_2m,weather_code")
      .then((r) => r.json())
      .then((j) => {
        const t = Math.round(j.current.temperature_2m);
        wEl.textContent = `${wmo(j.current.weather_code)} · ${t}°`;
      })
      .catch(() => { wEl.textContent = ""; });
  }

  // — scrambling status (runs once the HUD has settled, then loops) —
  const scrambles = [...document.querySelectorAll(".scramble")];
  const runScramble = () => { if (!reduced && !document.hidden) scrambles.forEach((el) => scramble(el)); };
  setTimeout(runScramble, 3400);
  setInterval(runScramble, 9000);

  // — stare toggle —
  const toggle = document.getElementById("shift-toggle");
  if (toggle && !cat) toggle.hidden = true;
  if (toggle && cat) {
    toggle.addEventListener("click", () => {
      const on = toggle.getAttribute("aria-pressed") === "true";
      toggle.setAttribute("aria-pressed", String(!on));
      gsap.to(cat.uStare, { value: on ? 0 : 1, duration: 0.6, ease: "power2.out" });
    });
  }
}
