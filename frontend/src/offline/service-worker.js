const PRECACHE = /* build-time assets */ [];
const CACHE_PREFIX = "jahan-fms-shell-";
const CACHE = `${CACHE_PREFIX}__BUILD__`;
const scope = self.registration.scope;
const shell = new URL("index.html", scope).href;
const scopePath = new URL(scope).pathname;
const assets = new Set(PRECACHE.map((path) => new URL(path, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...assets].map((url) => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // A tab loading during the upgrade can still need the previous build's files.
    const previous = names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE);
    await Promise.all(previous.slice(0, -1).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

const loadPage = async (request) => {
  try {
    const response = await fetch(request, { cache: "no-cache", signal: AbortSignal.timeout(3000) });
    if (response.status < 500) return response;
  } catch {
    // The installed shell can still open when the connection drops.
  }
  const cache = await caches.open(CACHE);
  return (await cache.match(shell)) ?? Response.error();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(scope)) return;
  const path = new URL(request.url).pathname;
  const relativePath = path.slice(scopePath.length);
  if (relativePath === "api" || relativePath.startsWith("api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(loadPage(request));
  } else if (assets.has(request.url)) {
    event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(request)) ?? fetch(request)));
  } else if (relativePath.startsWith("assets/")) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
  }
});
