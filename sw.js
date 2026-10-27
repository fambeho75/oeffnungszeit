/* Hours Pin — offline cache.
   Bump CACHE when HTML, CSS, or JS changes so old shells are dropped.
   places.json is network-first, so a hours-only update does not need a bump. */
const CACHE = "oeffnungszeit-v12";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=7",
  "./theme.js?v=1",
  "./hours.js?v=2",
  "./app.js?v=10",
  "./places.json",
  "./manifest.webmanifest?v=3",
  "./icon.svg?v=3",
  "./favicon-32.png?v=3",
  "./apple-touch-icon.png?v=3",
  "./icon-192.png?v=3",
  "./icon-512.png?v=3",
  "./icon-maskable-192.png?v=3",
  "./icon-maskable-512.png?v=3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((path) =>
        fetch(new Request(path, { cache: "no-store" })).then((res) => {
          if (!res || !res.ok) throw new Error(path);
          return cache.put(path, res);
        })
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("hours-pin-") || key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

function put(req, res) {
  if (!res || !res.ok || res.type !== "basic") return;
  const copy = res.clone();
  caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
}

function networkFirst(req, fallback) {
  return fetch(req.url, { cache: "no-store", credentials: "same-origin" })
    .then((res) => {
      put(req, res);
      return res;
    })
    .catch(() => caches.match(req).then((cached) => cached || (fallback ? caches.match(fallback) : undefined)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return;

  const isData = url.pathname.endsWith("/places.json");
  const isAppShell = req.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");

  if (isAppShell) {
    event.respondWith(networkFirst(req, "./index.html"));
    return;
  }
  if (isData) {
    event.respondWith(networkFirst(req, "./places.json"));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((res) => {
        put(req, res);
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
