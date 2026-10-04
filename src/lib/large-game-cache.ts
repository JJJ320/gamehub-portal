const CACHE_NAME = "gamehub-large-games-v1";
const CHUNK_ENDPOINT = "/api/game-chunk";
const MAX_PARALLEL_DOWNLOADS = 3;

export type LargeGameProgress = {
  completed: number;
  total: number;
  bytesDownloaded: number;
  totalBytes?: number;
};

export function isLargeGameUrl(value: string): boolean {
  try {
    const url = new URL(value, window.location.origin);
    return url.pathname === "/api/game-file" && Number(url.searchParams.get("parts") || "0") > 1;
  } catch {
    return false;
  }
}

function chunkRequestUrl(sourceUrl: string, index: number): string {
  const source = new URL(sourceUrl, window.location.origin);
  const url = new URL(CHUNK_ENDPOINT, window.location.origin);
  url.searchParams.set("slug", source.searchParams.get("slug") || "");
  url.searchParams.set("kind", source.searchParams.get("kind") || "game");
  url.searchParams.set("index", String(index));
  return url.toString();
}

export async function registerLargeGameServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("/gamehub-large-game-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    await registration.update();
  } catch (error) {
    console.warn("GameHub: não foi possível ativar o cache de jogos grandes.", error);
  }
}

async function ensureStorage(requiredBytes: number): Promise<void> {
  if (!navigator.storage?.estimate) return;
  const estimate = await navigator.storage.estimate();
  const quota = estimate.quota ?? 0;
  const usage = estimate.usage ?? 0;
  const available = Math.max(0, quota - usage);

  if (available > 0 && requiredBytes > available * 0.9) {
    throw new Error(
      "O navegador não tem armazenamento livre suficiente para preparar este jogo. " +
      "Libere espaço e tente novamente.",
    );
  }

  if (navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      // A persistência depende das políticas do navegador e não é obrigatória.
    }
  }
}

export async function prepareLargeGameCache(
  sourceUrl: string,
  onProgress?: (progress: LargeGameProgress) => void,
): Promise<void> {
  if (!isLargeGameUrl(sourceUrl)) return;

  await registerLargeGameServiceWorker();

  const source = new URL(sourceUrl, window.location.origin);
  const parts = Number(source.searchParams.get("parts") || "0");
  if (!parts || parts > 48) throw new Error("Quantidade de partes inválida para este jogo.");

  const sizeParam = Number(source.searchParams.get("size") || "0");
  await ensureStorage(sizeParam);

  const cache = await caches.open(CACHE_NAME);
  const requests = Array.from({ length: parts }, (_, index) => new Request(chunkRequestUrl(sourceUrl, index)));

  let completed = 0;
  let bytesDownloaded = 0;

  const downloadPart = async (request: Request) => {
    const existing = await cache.match(request);
    if (existing?.ok) {
      const size = Number(existing.headers.get("Content-Length") || "0");
      completed += 1;
      bytesDownloaded += Number.isFinite(size) ? size : 0;
      onProgress?.({ completed, total: parts, bytesDownloaded, totalBytes: sizeParam || undefined });
      return;
    }

    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Falha ao baixar uma parte do jogo (" + response.status + ").");
    }

    const clone = response.clone();
    await cache.put(request, clone);
    const size = Number(response.headers.get("Content-Length") || "0");
    completed += 1;
    bytesDownloaded += Number.isFinite(size) ? size : 0;
    onProgress?.({ completed, total: parts, bytesDownloaded, totalBytes: sizeParam || undefined });
  };

  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= requests.length) return;
      await downloadPart(requests[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_DOWNLOADS, requests.length) }, () => worker()),
  );
}
