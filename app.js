/* Öffnungszeit UI. Shared hours come from places.json.
   Old on-phone edits lived in localStorage under hours-pin-v1.
   That data is ignored and cleared once on load. */
(function () {
  "use strict";

  const KEY = "hours-pin-v1";
  const GITHUB_REPO = "fambeho75/oeffnungszeit";
  const GITHUB_ASSIGNEE = "fambeho75";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const LOGO = `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><circle cx="16" cy="16" r="10" fill="none" stroke="#111" stroke-width="2.5"/><path d="M16 16V8M16 16H23" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="square"/></svg>`;
  const SUN = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M18.9 5.1l-1.8 1.8M6.9 17.1l-1.8 1.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`;
  const MOON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 3.5a8.2 8.2 0 1 0 5.5 14.2A7 7 0 0 1 15 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/></svg>`;

  let catalog = null;
  let fetchedAt = 0;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function clearStoredPins() {
    try {
      localStorage.removeItem(KEY);
    } catch (err) {
      /* storage unavailable; official hours are shown either way */
    }
  }

  function places() {
    return catalog.places;
  }

  function route() {
    let hash = "/";
    try {
      hash = decodeURIComponent((location.hash || "#/").replace(/^#/, "")) || "/";
    } catch (err) {
      hash = "/";
    }
    const parts = hash.split("/").filter(Boolean);
    if (parts[0] === "place" && parts[1]) return { name: "detail", id: parts[1] };
    return { name: "home" };
  }

  function placeHref(id) {
    return `#/place/${encodeURIComponent(id)}`;
  }

  function formatISO(iso) {
    const bits = String(iso || "").split("-").map(Number);
    if (bits.length < 3 || !bits[0] || !bits[1] || !bits[2]) return iso || "";
    return `${bits[2]} ${MONTHS[bits[1] - 1]} ${bits[0]}`;
  }

  function formatSpan(start, end) {
    if (!end || start === end) return formatISO(start);
    const a = start.split("-").map(Number);
    const b = end.split("-").map(Number);
    if (a[0] === b[0] && a[1] === b[1]) return `${a[2]}–${b[2]} ${MONTHS[a[1] - 1]} ${a[0]}`;
    return `${formatISO(start)} – ${formatISO(end)}`;
  }

  function clockText(date) {
    const parts = HoursPin.stockholmParts(date);
    const label = HoursPin.WEEKDAYS.find((day) => day.key === parts.key);
    const hh = String(Math.floor(parts.minutes / 60)).padStart(2, "0");
    const mm = String(parts.minutes % 60).padStart(2, "0");
    return `Stockholm · ${label ? label.label : ""} ${hh}:${mm}`;
  }

  function statusWord(status) {
    if (status === "open") return "Open";
    if (status === "unknown") return "Unknown";
    return "Closed";
  }

  function todayBits(place, date) {
    const resolved = HoursPin.resolveDay(place, date);
    let line = HoursPin.todayLine(place, date);
    if (resolved.label) line += ` · ${resolved.label}`;
    return { status: HoursPin.statusAt(place, date), line };
  }

  function currentTheme() {
    return HoursTheme.normalize(document.documentElement.getAttribute("data-theme"));
  }

  function syncThemeButton() {
    const btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    const dark = currentTheme() === "dark";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    btn.innerHTML = dark ? SUN : MOON;
  }

  function applyTheme(theme) {
    const next = HoursTheme.normalize(theme);
    document.documentElement.setAttribute("data-theme", next);
    const color = HoursTheme.color(next);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", color);
    const schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (schemeMeta) schemeMeta.setAttribute("content", next);
    try {
      localStorage.setItem(HoursTheme.KEY, next);
    } catch (err) {
      /* choice still applies for this visit */
    }
    syncThemeButton();
  }

  function themeButton() {
    const dark = currentTheme() === "dark";
    const label = dark ? "Switch to light mode" : "Switch to dark mode";
    return `<button type="button" class="theme-toggle" data-action="theme" aria-label="${label}">${dark ? SUN : MOON}</button>`;
  }

  function header() {
    return `
      <header>
        <div class="logo" aria-hidden="true">${LOGO}</div>
        <div class="brand-block">
          <h1 class="brand">Öffnungszeit</h1>
          <p class="tagline" id="clock">${esc(clockText(new Date()))}</p>
        </div>
        ${themeButton()}
      </header>`;
  }

  function shell(body, title) {
    document.title = title;
    document.getElementById("app").innerHTML = `${header()}${body}`;
  }

  function placeRow(place, now) {
    const bits = todayBits(place, now);
    return `
      <a class="place" href="${placeHref(place.id)}">
        <span class="place-name">${esc(place.name)}</span>
        <span class="badge badge-${bits.status}" data-status-for="${esc(place.id)}">${statusWord(bits.status)}</span>
        <p class="place-today"><span class="k">Today</span> <span data-today-for="${esc(place.id)}">${esc(bits.line)}</span></p>
      </a>`;
  }

  function renderHome() {
    const now = new Date();
    const list = places();
    const body = list.length
      ? list.map((place) => placeRow(place, now)).join("")
      : `
        <div class="card">
          <p class="empty-title">No places yet.</p>
          <p class="hint">Add a shop to see if it is open.</p>
        </div>`;
    const updated = catalog.updated ? `<p class="updated">Hours updated ${esc(formatISO(catalog.updated))}</p>` : "";
    const addBody = "Place name:\nTown: Skövde\nNotes (optional):\n";
    const addHref = `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent("Add place: ")}&labels=add-place&body=${encodeURIComponent(addBody)}&assignees=${encodeURIComponent(GITHUB_ASSIGNEE)}`;
    shell(`
      <main>
        ${body}
        <p class="add-row"><a class="add-place" href="${esc(addHref)}" target="_blank" rel="noopener noreferrer">+ Add place</a></p>
        ${updated}
      </main>`, "Öffnungszeit");
  }

  function hoursLine(kind, slots) {
    if (kind === "unknown") return "Unknown";
    if (kind === "closed") return "Closed";
    return HoursPin.formatSlots(slots);
  }

  function weekSection(place, now) {
    const todayKey = HoursPin.stockholmParts(now).key;
    const rows = HoursPin.WEEKDAYS.map((day) => {
      const isToday = day.key === todayKey;
      const resolved = isToday
        ? HoursPin.resolveDay(place, now)
        : HoursPin.interpret(place.hours && place.hours[day.key]);
      const holiday = isToday && resolved.label
        ? ` <span class="ex-name">${esc(resolved.label)}</span>`
        : "";
      const todayTag = isToday ? `<span class="today-tag">Today</span>` : "";
      return `
        <div class="week-row${isToday ? " is-today" : ""}">
          <span class="day-label">${day.label}${todayTag}</span>
          <span class="hours-line">${esc(hoursLine(resolved.kind, resolved.slots))}${holiday}</span>
        </div>`;
    }).join("");
    return `<div class="week">${rows}</div>`;
  }

  function exceptionRow(ex, today) {
    const on = ex.start <= today && today <= ex.end;
    const interpreted = HoursPin.interpret(ex.hours);
    return `
      <div class="ex-row${on ? " is-today" : ""}">
        <span class="ex-label">${esc(ex.label || "Exception")}</span>
        <span class="hours-line">${esc(hoursLine(interpreted.kind, interpreted.slots))}</span>
        <span class="ex-when">${esc(formatSpan(ex.start, ex.end))}</span>
      </div>`;
  }

  function exceptionSection(place, now) {
    const items = HoursPin.upcomingExceptions(place, now);
    if (!items.length) return "";
    const today = HoursPin.stockholmParts(now).ymd;
    const soon = items.slice(0, 6).map((ex) => exceptionRow(ex, today)).join("");
    const later = items.length > 6
      ? `<details class="later"><summary>Later dates (${items.length - 6})</summary><div class="week">${items.slice(6).map((ex) => exceptionRow(ex, today)).join("")}</div></details>`
      : "";
    return `<h2 class="section">Exceptions</h2><div class="week">${soon}</div>${later}`;
  }

  function renderDetail(id) {
    const place = places().find((item) => item.id === id);
    if (!place) {
      shell(`
        <main>
          <a class="back" href="#/">Places</a>
          <h2 class="place-title">Place not found</h2>
        </main>`, "Öffnungszeit");
      return;
    }
    const now = new Date();
    const bits = todayBits(place, now);
    shell(`
      <main>
        <a class="back" href="#/">Places</a>
        <h2 class="place-title">${esc(place.name)}</h2>
        <div class="status-row">
          <span class="badge badge-${bits.status}" data-status-for="${esc(place.id)}">${statusWord(bits.status)}</span>
        </div>
        ${weekSection(place, now)}
        ${exceptionSection(place, now)}
      </main>`, `${place.name} · Öffnungszeit`);
  }

  function renderLoading() {
    shell(`<main><p class="hint">Loading hours…</p></main>`, "Öffnungszeit");
  }

  function renderError() {
    shell(`
      <main>
        <div class="card">
          <p class="empty-title">Could not load hours.</p>
          <p class="hint">Check the connection, then try again.</p>
          <button type="button" class="btn btn-primary" data-action="retry">Try again</button>
        </div>
      </main>`, "Öffnungszeit");
  }

  function render() {
    if (!catalog) return;
    const current = route();
    if (current.name === "detail") renderDetail(current.id);
    else renderHome();
  }

  function onClick(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "theme") {
      applyTheme(HoursTheme.toggle(currentTheme()));
      return;
    }
    if (btn.dataset.action === "retry") boot();
  }

  function tick() {
    const clock = document.getElementById("clock");
    if (clock) clock.textContent = clockText(new Date());
    if (!catalog) return;
    const current = route();
    if (current.name !== "home" && current.name !== "detail") return;
    const now = new Date();
    const visible = current.name === "home"
      ? places()
      : places().filter((place) => place.id === current.id);
    visible.forEach((place) => {
      if (!/^[a-z0-9-]+$/i.test(place.id)) return;
      const bits = todayBits(place, now);
      document.querySelectorAll(`[data-status-for="${place.id}"]`).forEach((el) => {
        el.textContent = statusWord(bits.status);
        el.className = `badge badge-${bits.status}`;
      });
      document.querySelectorAll(`[data-today-for="${place.id}"]`).forEach((el) => {
        el.textContent = bits.line;
      });
    });
  }

  async function loadCatalog() {
    const res = await fetch("./places.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!data || !Array.isArray(data.places)) throw new Error("bad catalog");
    catalog = data;
    fetchedAt = Date.now();
  }

  async function boot() {
    clearStoredPins();
    renderLoading();
    try {
      await loadCatalog();
      render();
    } catch (err) {
      catalog = null;
      renderError();
    }
  }

  async function onVisible() {
    if (document.visibilityState !== "visible") return;
    if (catalog && Date.now() - fetchedAt > 15 * 60 * 1000) {
      try { await loadCatalog(); } catch (err) { /* keep the list already on screen */ }
    }
    const name = route().name;
    if (name === "home" || name === "detail") render();
    else tick();
  }

  function registerSW() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  document.getElementById("app").addEventListener("click", onClick);
  window.addEventListener("hashchange", render);
  document.addEventListener("visibilitychange", onVisible);
  setInterval(tick, 30000);
  registerSW();
  boot();
})();
