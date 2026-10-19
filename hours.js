/* Opening-hours math for Hours Pin.
   "Now" is always Europe/Stockholm, never the phone's timezone setting.
   A span is open from its start up to, but not including, its close.
   Spans must not cross midnight. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HoursPin = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TZ = "Europe/Stockholm";

  const WEEKDAYS = [
    { key: "mon", label: "Mon" },
    { key: "tue", label: "Tue" },
    { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" },
    { key: "fri", label: "Fri" },
    { key: "sat", label: "Sat" },
    { key: "sun", label: "Sun" },
  ];

  const WEEKDAY_KEY = {
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
    Sun: "sun",
  };

  function stockholmParts(date) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const bag = {};
    fmt.formatToParts(date || new Date()).forEach((part) => {
      bag[part.type] = part.value;
    });
    let hour = bag.hour;
    if (hour === "24") hour = "00";
    return {
      ymd: `${bag.year}-${bag.month}-${bag.day}`,
      key: WEEKDAY_KEY[bag.weekday] || "mon",
      minutes: Number(hour) * 60 + Number(bag.minute),
    };
  }

  function parseMinutes(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function formatSlots(slots) {
    if (!slots || !slots.length) return "Closed";
    return slots.map((slot) => `${slot.open}–${slot.close}`).join(", ");
  }

  /* "closed", "unknown", or a list of {open, close}. An empty list is closed. */
  function interpret(value) {
    if (value == null || value === "unknown") return { kind: "unknown", slots: [] };
    if (value === "closed") return { kind: "closed", slots: [] };
    if (Array.isArray(value)) {
      if (!value.length) return { kind: "closed", slots: [] };
      return { kind: "hours", slots: value };
    }
    return { kind: "unknown", slots: [] };
  }

  /* A single date beats a date range. Later entries beat earlier ones of the same kind. */
  function activeException(exceptions, ymd) {
    if (!Array.isArray(exceptions)) return null;
    let ranged = null;
    let exact = null;
    exceptions.forEach((ex) => {
      if (!ex) return;
      if (ex.date) {
        if (ex.date === ymd) exact = ex;
        return;
      }
      if (ex.start && ex.end && ex.start <= ymd && ymd <= ex.end) ranged = ex;
    });
    return exact || ranged;
  }

  function resolveDay(place, date) {
    const parts = stockholmParts(date || new Date());
    const ex = activeException(place && place.exceptions, parts.ymd);
    if (ex) {
      const base = interpret(ex.hours);
      return {
        kind: base.kind,
        slots: base.slots,
        label: ex.label || "",
        fromException: true,
        parts,
      };
    }
    const weekly = place && place.hours ? place.hours[parts.key] : "unknown";
    const base = interpret(weekly);
    return {
      kind: base.kind,
      slots: base.slots,
      label: "",
      fromException: false,
      parts,
    };
  }

  function statusAt(place, date) {
    const resolved = resolveDay(place, date);
    if (resolved.kind === "unknown") return "unknown";
    if (resolved.kind === "closed") return "closed";
    const mins = resolved.parts.minutes;
    let valid = false;
    for (let i = 0; i < resolved.slots.length; i += 1) {
      const slot = resolved.slots[i];
      const open = parseMinutes(slot && slot.open);
      const close = parseMinutes(slot && slot.close);
      if (open == null || close == null || close <= open) continue;
      valid = true;
      if (mins >= open && mins < close) return "open";
    }
    return valid ? "closed" : "unknown";
  }

  function todayLine(place, date) {
    const resolved = resolveDay(place, date);
    if (resolved.kind === "unknown") return "Hours unknown";
    if (resolved.kind === "closed") return "Closed";
    return formatSlots(resolved.slots);
  }

  function upcomingExceptions(place, date) {
    const today = stockholmParts(date || new Date()).ymd;
    const list = [];
    const exceptions = (place && place.exceptions) || [];
    exceptions.forEach((ex) => {
      if (!ex) return;
      const start = ex.date || ex.start;
      const end = ex.date || ex.end || start;
      if (!start || !end || end < today) return;
      list.push({
        label: ex.label || "",
        hours: ex.hours,
        start,
        end,
      });
    });
    list.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.end < b.end ? -1 : 1));
    return list;
  }

  return {
    TZ,
    WEEKDAYS,
    stockholmParts,
    parseMinutes,
    formatSlots,
    interpret,
    activeException,
    resolveDay,
    statusAt,
    todayLine,
    upcomingExceptions,
  };
});
