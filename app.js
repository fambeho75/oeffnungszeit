/* Öffnungszeit UI. Shared hours come from places.json.
   Edits on this phone live in localStorage under hours-pin-v1 and win until cleared. */
(function () {
  "use strict";

  const KEY = "hours-pin-v1";
  const GITHUB_REPO = "fambeho75/oeffnungszeit";
  const GITHUB_ASSIGNEE = "fambeho75";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const LOGO = `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><circle cx="16" cy="16" r="10" fill="none" stroke="#111" stroke-width="2.5"/><path d="M16 16V8M16 16H23" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="square"/></svg>`;

  let catalog = null;
  let fetchedAt = 0;
  const ui = { confirmId: null, error: "" };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { removed: [], overrides: {}, custom: [] };
      const data = JSON.parse(raw);
      return {
        removed: Array.isArray(data.removed) ? data.removed : [],
        overrides: data.overrides && typeof data.overrides === "object" ? data.overrides : {},
        custom: Array.isArray(data.custom) ? data.custom : [],
      };
    } catch (err) {
      return { removed: [], overrides: {}, custom: [] };
    }
  }

  function persist(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      ui.error = "";
      return true;
    } catch (err) {
      ui.error = "Could not save on this phone.";
      return false;
    }
  }

  function places() {
    return HoursPin.mergePlaces(catalog.places, load());
  }

  function route() {
    let hash = "/";
    try {
      hash = decodeURIComponent((location.hash || "#/").replace(/^#/, "")) || "/";
    } catch (err) {
      hash = "/";
    }
    const parts = hash.split("/").filter(Boolean);
    if (!parts.length) return { name: "home" };
    if (parts[0] === "add") return { name: "add" };
    if (parts[0] === "place" && parts[1]) {
      if (parts[2] === "edit") return { name: "edit", id: parts[1] };
      return { name: "detail", id: parts[1] };
    }
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

  function header() {
    return `
      <header>
        <div class="logo" aria-hidden="true">${LOGO}</div>
        <div>
          <h1 class="brand">Öffnungszeit</h1>
          <p class="tagline" id="clock">${esc(clockText(new Date()))}</p>
        </div>
      </header>`;
  }

  function shell(body, title) {
    document.title = title;
    const err = ui.error ? `<p class="form-error">${esc(ui.error)}</p>` : "";
    document.getElementById("app").innerHTML = `${header()}${err}${body}`;
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
    const later = items.slice(6);
    const rest = later.length
      ? `<details class="later"><summary>Later dates (${later.length})</summary><div class="week">${later.map((ex) => exceptionRow(ex, today)).join("")}</div></details>`
      : "";
    return `<h2 class="section">Exceptions</h2><div class="week">${soon}</div>${rest}`;
  }

  function removeBlock(place) {
    if (ui.confirmId !== place.id) {
      return `<button type="button" class="quiet quiet-danger" data-action="ask-remove" data-id="${esc(place.id)}">Remove</button>`;
    }
    return `
      <span class="confirm-inline">
        <button type="button" class="quiet quiet-danger" data-action="confirm-remove" data-id="${esc(place.id)}">Remove</button>
        <button type="button" class="quiet" data-action="cancel-remove">Cancel</button>
      </span>`;
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
    shell(`
      <main>
        <a class="back" href="#/">Places</a>
        <h2 class="place-title">${esc(place.name)}</h2>
        ${weekSection(place, now)}
        ${exceptionSection(place, now)}
        <div class="tools">
          <a class="quiet" href="${placeHref(place.id)}/edit">Edit hours</a>
          ${removeBlock(place)}
        </div>
      </main>`, `${place.name} · Öffnungszeit`);
  }

  function normTime(value) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value || "").trim());
    if (!match) return "";
    return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
  }

  function dayFields(hours) {
    return HoursPin.WEEKDAYS.map((day) => {
      const value = hours && hours[day.key];
      const closed = value === "closed" || (Array.isArray(value) && value.length === 0);
      const slot = Array.isArray(value) && value[0] ? value[0] : null;
      return `
        <div class="day${closed ? " is-closed" : ""}" data-day="${day.key}">
          <div class="day-top">
            <span class="day-name">${day.label}</span>
            <button type="button" class="chip" data-action="toggle-closed" aria-pressed="${closed ? "true" : "false"}">Closed</button>
          </div>
          <div class="day-times">
            <input type="time" data-open value="${esc(slot ? slot.open : "")}" aria-label="${day.label} opens">
            <span class="dash" aria-hidden="true">–</span>
            <input type="time" data-close value="${esc(slot ? slot.close : "")}" aria-label="${day.label} closes">
          </div>
        </div>`;
    }).join("");
  }

  function nameField(name) {
    return `
      <label for="place-name">Name</label>
      <input id="place-name" name="place-name" type="text" maxlength="80" autocomplete="off" autocapitalize="words" required value="${esc(name)}">`;
  }

  function defaultHours() {
    const hours = {};
    HoursPin.WEEKDAYS.forEach((day) => {
      if (day.key === "sun") hours[day.key] = "closed";
      else if (day.key === "sat") hours[day.key] = [{ open: "10:00", close: "16:00" }];
      else hours[day.key] = [{ open: "08:00", close: "20:00" }];
    });
    return hours;
  }

  function renderAdd() {
    shell(`
      <main>
        <a class="back" href="#/">Places</a>
        <h2 class="place-title">Add place</h2>
        <form data-mode="add">
          ${nameField("")}
          <p class="label">Hours</p>
          ${dayFields(defaultHours())}
          <p class="form-error" role="alert"></p>
          <div class="dock">
            <button class="btn btn-primary" type="submit">Pin place</button>
          </div>
        </form>
      </main>`, "Add place · Öffnungszeit");
  }

  function renderEdit(id) {
    const place = places().find((item) => item.id === id);
    if (!place) {
      shell(`
        <main>
          <a class="back" href="#/">Places</a>
          <h2 class="place-title">Place not found</h2>
        </main>`, "Öffnungszeit");
      return;
    }
    shell(`
      <main>
        <a class="back" href="${placeHref(place.id)}">Back</a>
        <h2 class="place-title">Edit hours</h2>
        <form data-mode="edit" data-id="${esc(place.id)}">
          ${dayFields(place.hours)}
          <p class="form-error" role="alert"></p>
          <div class="dock">
            <button class="btn btn-primary" type="submit">Save</button>
          </div>
        </form>
      </main>`, "Edit hours · Öffnungszeit");
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
    if (current.name === "add") renderAdd();
    else if (current.name === "edit") renderEdit(current.id);
    else if (current.name === "detail") renderDetail(current.id);
    else renderHome();
  }

  function readHours(form) {
    const hours = {};
    for (let i = 0; i < HoursPin.WEEKDAYS.length; i += 1) {
      const day = HoursPin.WEEKDAYS[i];
      const row = form.querySelector(`[data-day="${day.key}"]`);
      const closed = row.querySelector("[data-action='toggle-closed']").getAttribute("aria-pressed") === "true";
      if (closed) {
        hours[day.key] = "closed";
        continue;
      }
      const open = normTime(row.querySelector("[data-open]").value);
      const close = normTime(row.querySelector("[data-close]").value);
      if (!open && !close) {
        hours[day.key] = "unknown";
        continue;
      }
      if (!open || !close) return { error: `${day.label}: set both times, or mark it closed.` };
      const openMin = HoursPin.parseMinutes(open);
      const closeMin = HoursPin.parseMinutes(close);
      if (openMin == null || closeMin == null || closeMin <= openMin) {
        return { error: `${day.label}: close must be after open.` };
      }
      hours[day.key] = [{ open, close }];
    }
    return { hours };
  }

  function hoursEqual(a, b) {
    if (!a || !b) return false;
    return HoursPin.WEEKDAYS.every((day) =>
      JSON.stringify(a[day.key] ?? "unknown") === JSON.stringify(b[day.key] ?? "unknown"));
  }

  function newId() {
    const local = load();
    const taken = new Set(catalog.places.map((place) => place.id).concat(local.custom.map((place) => place.id)));
    let id = "";
    do {
      id = `p-${Math.random().toString(36).slice(2, 10)}`;
    } while (taken.has(id) || !/^p-[a-z0-9]+$/.test(id));
    return id;
  }

  function onSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const error = form.querySelector(".form-error");
    const built = readHours(form);
    if (built.error) {
      error.textContent = built.error;
      error.scrollIntoView({ block: "nearest" });
      return;
    }
    const local = load();
    const mode = form.dataset.mode;
    if (mode === "add") {
      const name = form.elements["place-name"].value.trim().replace(/\s+/g, " ");
      if (!name) {
        error.textContent = "Add a name.";
        return;
      }
      const id = newId();
      local.custom.push({ id, name, hours: built.hours });
      if (!persist(local)) {
        error.textContent = ui.error;
        return;
      }
      location.hash = `#/place/${encodeURIComponent(id)}`;
      return;
    }
    const id = form.dataset.id;
    const shipped = catalog.places.find((place) => place.id === id);
    if (!shipped) {
      const index = local.custom.findIndex((place) => place.id === id);
      if (index < 0) return;
      local.custom[index] = Object.assign({}, local.custom[index], { hours: built.hours });
    } else if (hoursEqual(built.hours, shipped.hours)) {
      delete local.overrides[id];
    } else {
      local.overrides[id] = { hours: built.hours };
    }
    if (!persist(local)) {
      error.textContent = ui.error;
      return;
    }
    location.hash = `#/place/${encodeURIComponent(id)}`;
  }

  function onClick(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "toggle-closed") {
      const row = btn.closest("[data-day]");
      const closed = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", closed ? "true" : "false");
      row.classList.toggle("is-closed", closed);
      return;
    }
    if (action === "retry") {
      boot();
      return;
    }
    if (action === "ask-remove") {
      ui.confirmId = btn.dataset.id;
      render();
      return;
    }
    if (action === "cancel-remove") {
      ui.confirmId = null;
      render();
      return;
    }
    if (action === "confirm-remove") {
      const id = btn.dataset.id;
      const local = load();
      if (catalog.places.some((place) => place.id === id)) {
        if (!local.removed.includes(id)) local.removed.push(id);
      } else {
        local.custom = local.custom.filter((place) => place.id !== id);
      }
      if (!persist(local)) {
        render();
        return;
      }
      ui.confirmId = null;
      location.hash = "#/";
      return;
    }
    if (action === "clear-override") {
      const local = load();
      delete local.overrides[btn.dataset.id];
      if (!persist(local)) {
        render();
        return;
      }
      render();
      return;
    }
    if (action === "restore") {
      const local = load();
      local.removed = [];
      if (!persist(local)) {
        render();
        return;
      }
      render();
      return;
    }
    if (action === "restore-one") {
      const local = load();
      local.removed = local.removed.filter((id) => id !== btn.dataset.id);
      if (!persist(local)) {
        render();
        return;
      }
      render();
    }
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
  document.getElementById("app").addEventListener("submit", onSubmit);
  window.addEventListener("hashchange", () => {
    ui.confirmId = null;
    render();
  });
  document.addEventListener("visibilitychange", onVisible);
  setInterval(tick, 30000);
  registerSW();
  boot();
})();
