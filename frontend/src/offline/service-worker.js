const PRECACHE = /* build-time assets */ [];
const CACHE = "jahan-fms-shell-__BUILD__";
const scope = self.registration.scope;
const shell = new URL("index.html", scope).href;
const assets = new Set(PRECACHE.map((path) => new URL(path, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(
    [...assets].map((url) => new Request(url, { cache: "reload" })),
  )));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("jahan-fms-shell-") && name !== CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(scope)) return;
  const path = new URL(request.url).pathname;
  const relativePath = path.slice(new URL(scope).pathname.length);
  if (relativePath === "api" || relativePath.startsWith("api/")) return;

  const key = request.mode === "navigate" ? shell : request.url;
  if (!assets.has(key)) return;
  event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(key)) ?? fetch(request)));
});
