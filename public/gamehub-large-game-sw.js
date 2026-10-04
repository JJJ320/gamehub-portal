const CACHE_NAME = "gamehub-large-games-v1";
const CHUNK_PATH = "/api/game-chunk";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function getChunkUrl(baseUrl, index) {
  const url = new URL(baseUrl);
  url.pathname = CHUNK_PATH;
  url.searchParams.set("index", String(index));
  return url.toString();
}

async function streamCachedParts(request) {
  const url = new URL(request.url);
  const parts = Number(url.searchParams.get("parts") || "0");
  const slug = url.searchParams.get("slug") || "";
  const kind = url.searchParams.get("kind") || "game";

  if (!parts || !slug || (kind !== "game" && kind !== "game-mobile")) {
    return fetch(request);
  }

  const cache = await caches.open(CACHE_NAME);
  const chunkBase = new URL(request.url);
  chunkBase.pathname = CHUNK_PATH;
  chunkBase.search = "";
  chunkBase.searchParams.set("slug", slug);
  chunkBase.searchParams.set("kind", kind);

  const cached = [];
  for (let index = 0; index < parts; index += 1) {
    const response = await cache.match(getChunkUrl(chunkBase, index));
    if (!response || !response.ok) return fetch(request);
    cached.push(response);
  }

  const first = cached[0];
  const headers = new Headers();
  headers.set("Content-Type", url.searchParams.get("mime") || first.headers.get("Content-Type") || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-GameHub-Cache", "browser");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (const response of cached) {
          const reader = response.body.getReader();
          try {
            while (true) {
              const result = await reader.read();
              if (result.done) break;
              if (result.value) controller.enqueue(result.value);
            }
          } finally {
            reader.releaseLock();
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, { status: 200, headers });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname !== "/api/game-file") return;

  event.respondWith(streamCachedParts(event.request));
});
