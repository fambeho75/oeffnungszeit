/* Theme choice for Öffnungszeit.
   The inline script in index.html must use the same key and colours. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HoursTheme = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const KEY = "oeffnungszeit-theme";
  const COLORS = { dark: "#0a0a0a", light: "#f7f7f8" };

  function normalize(value) {
    return value === "light" || value === "dark" ? value : "dark";
  }

  function toggle(current) {
    return normalize(current) === "light" ? "dark" : "light";
  }

  function color(theme) {
    return COLORS[normalize(theme)];
  }

  return { KEY, COLORS, normalize, toggle, color };
});
