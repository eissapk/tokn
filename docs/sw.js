/*
 * TOKN service worker — makes the app work offline.
 *
 * `scripts/build-sw.js` runs after `npm run build` and replaces VERSION and
 * PRECACHE below with a content hash and the list of built files. The
 * unprocessed copy (served by the dev server) is a no-op that removes itself,
 * so development never serves stale files from a cache.
 *
 * Strategies:
 *  - Page navigations: network first, fall back to the cached page (offline).
 *  - Same-origin files: cache first (built assets are content-hashed).
 *  - Google Fonts: stale-while-revalidate.
 *  - Everything else (e.g. the Ollama API on localhost) is not touched.
 */

const VERSION = "e626a28c2ef1";
const PRECACHE = ["./","assets/index-BgZgEhTP.js","assets/index-CmuoW5Ly.css","assets/store-z-MXxGmh.js","assets/transition-CAFINo1z.js","chat/index.html","chat/","favicon.svg","index.html","ollama.png","tokn-mark.svg"];

const CACHE_PREFIX = "tokn-";
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const FONT_CACHE = `${CACHE_PREFIX}fonts`;
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const scope = new URL(self.registration.scope);
const toURL = (p) => new URL(p, scope).href;

if (VERSION === "dev") {
  // Dev build: don't cache anything, clean up and unregister.
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k)));
        await self.registration.unregister();
      })(),
    );
  });
} else {
  self.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(PRECACHE.map((p) => new Request(toURL(p), { cache: "reload" })));
        await self.skipWaiting();
      })(),
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== STATIC_CACHE && k !== FONT_CACHE)
            .map((k) => caches.delete(k)),
        );
        await self.clients.claim();
      })(),
    );
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (FONT_HOSTS.includes(url.hostname)) {
      event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
      return;
    }

    if (url.origin !== scope.origin) return;

    if (request.mode === "navigate") {
      event.respondWith(networkFirstPage(request));
      return;
    }

    event.respondWith(cacheFirst(request));
  });
}

async function networkFirstPage(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const url = new URL(request.url);
    const path = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
    const candidates = [
      request,
      toURL(path.replace(/^\//, "")),
      toURL(path.replace(/^\//, "") + "index.html"),
      toURL("index.html"),
      toURL("./"),
    ];
    for (const candidate of candidates) {
      const hit = await cache.match(candidate, { ignoreSearch: true });
      if (hit) return hit;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit || network;
}
