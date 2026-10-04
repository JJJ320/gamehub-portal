import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where, type Timestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";
import type { Game } from "@/data/games";

export type GameType = "internal" | "url" | "html" | "zip" | "flash";

export type GameDocument = Game & {
  gameType?: GameType;
  gameUrl?: string;
  mobileGameUrl?: string;
  mobileGameType?: GameType;
  mobileVersionEnabled?: boolean;
  published?: boolean;
  createdAt?: string;
  updatedAt?: unknown;
  uniquePlayers?: number;
  ratingSum?: number;
  ratingCount?: number;
  metricsInitialized?: boolean;
};

const gamesCollection = collection(db, "games");
const MAX_GAME_FILE_BYTES = 50 * 1024 * 1024;
const LARGE_GAME_THRESHOLD_BYTES = 50 * 1024 * 1024;
const LARGE_GAME_CHUNK_BYTES = 20 * 1024 * 1024;
const MAX_LARGE_GAME_PARTS = 48;

function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Timestamp | undefined;
  return timestamp && typeof timestamp.toDate === "function"
    ? timestamp.toDate().toISOString()
    : typeof value === "string"
      ? value
      : undefined;
}

function normalizeGame(data: Record<string, unknown>): GameDocument {
  const ratingSum = typeof data.ratingSum === "number" ? data.ratingSum : 0;
  const ratingCount = typeof data.ratingCount === "number" ? data.ratingCount : 0;
  const uniquePlayers =
    typeof data.uniquePlayers === "number"
      ? Math.max(0, data.uniquePlayers)
      : typeof data.plays === "number" && data.metricsInitialized === true
        ? Math.max(0, data.plays)
        : 0;

  return {
    ...(data as unknown as GameDocument),
    ratingSum,
    ratingCount,
    uniquePlayers,
    rating: ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : 0,
    plays: uniquePlayers,
    createdAt: timestampToIso(data.createdAt ?? data.updatedAt),
  };
}

export async function listPublishedGames(): Promise<GameDocument[]> {
  const snapshot = await getDocs(query(gamesCollection, where("published", "==", true)));
  return snapshot.docs.map((item) => normalizeGame(item.data() as Record<string, unknown>));
}

export async function listOwnerGames(): Promise<GameDocument[]> {
  const snapshot = await getDocs(gamesCollection);
  return snapshot.docs.map((item) => normalizeGame(item.data() as Record<string, unknown>));
}

export async function getGameDocument(slug: string): Promise<GameDocument | null> {
  const snapshot = await getDocs(query(gamesCollection, where("slug", "==", slug)));
  const item = snapshot.docs[0];
  return item ? normalizeGame(item.data() as Record<string, unknown>) : null;
}

export async function saveGame(game: GameDocument): Promise<void> {
  const gameRef = doc(db, "games", game.slug);
  const payload: Record<string, unknown> = {
    ...game,
    metricsInitialized: true,
    updatedAt: serverTimestamp(),
  };

  delete payload.createdAt;

  const existing = await getDocs(query(gamesCollection, where("slug", "==", game.slug)));
  const existingData = existing.empty ? null : existing.docs[0].data();

  if (existing.empty || existingData?.metricsInitialized !== true) {
    if (existing.empty) payload.createdAt = serverTimestamp();
    payload.uniquePlayers = 0;
    payload.plays = 0;
    payload.ratingSum = 0;
    payload.ratingCount = 0;
    payload.rating = 0;
  }

  await setDoc(gameRef, payload, { merge: true });
}

async function deleteGameAssets(slug: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Faça login antes de excluir o jogo.");

  const idToken = await user.getIdToken();
  const response = await fetch(
    "/api/game-assets?slug=" + encodeURIComponent(slug),
    { method: "DELETE", headers: { Authorization: "Bearer " + idToken } },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error ?? "Falha ao excluir os arquivos do jogo.");
  }
}

export async function deleteGame(slug: string): Promise<void> {
  await deleteGameAssets(slug);
  await deleteDoc(doc(db, "games", slug));
}

async function uploadGameFile(
  slug: string,
  file: File,
  kind: "game" | "game-mobile" = "game",
  onProgress?: (completed: number, total: number) => void,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Faça login antes de enviar o jogo.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const contentType = file.type || "application/octet-stream";

  if (file.size <= LARGE_GAME_THRESHOLD_BYTES) {
    if (file.size > MAX_GAME_FILE_BYTES) {
      throw new Error("Arquivo muito grande. Arquivos acima de 25 MB usam o envio em partes.");
    }

    const idToken = await user.getIdToken();
    const response = await fetch(
      "/api/game-upload?slug=" + encodeURIComponent(slug) +
        "&kind=" + kind + "&filename=" + encodeURIComponent(safeName),
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + idToken,
          "Content-Type": contentType,
          "Content-Length": String(file.size),
        },
        body: file,
      },
    );

    const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !result.url) throw new Error(result.error ?? "Falha no upload do jogo.");
    onProgress?.(1, 1);
    return result.url;
  }

  const totalParts = Math.ceil(file.size / LARGE_GAME_CHUNK_BYTES);
  if (totalParts > MAX_LARGE_GAME_PARTS) {
    throw new Error("Este arquivo é grande demais para o sistema de partes atual. O máximo é aproximadamente 960 MB.");
  }

  const idToken = await user.getIdToken();
  let completed = 0;
  const concurrency = 3;
  const indexes = Array.from({ length: totalParts }, (_, index) => index);

  const uploadPart = async (index: number) => {
    const start = index * LARGE_GAME_CHUNK_BYTES;
    const end = Math.min(file.size, start + LARGE_GAME_CHUNK_BYTES);
    const chunk = file.slice(start, end);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(
          "/api/game-upload?slug=" + encodeURIComponent(slug) +
            "&kind=" + kind +
            "&filename=" + encodeURIComponent(safeName) +
            "&chunkIndex=" + index +
            "&totalParts=" + totalParts +
            (index === 0 ? "&reset=1" : ""),
          {
            method: "PUT",
            headers: {
              Authorization: "Bearer " + idToken,
              "Content-Type": contentType,
            },
            body: chunk,
          },
        );

        const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!response.ok || !result.ok) {
          throw new Error(result.error ?? ("Falha ao enviar a parte " + (index + 1) + "/" + totalParts + "."));
        }

        completed += 1;
        onProgress?.(completed, totalParts);
        return;
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  };

  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= indexes.length) return;
      await uploadPart(index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, totalParts) }, () => worker()));

  return (
    "/api/game-file?slug=" + encodeURIComponent(slug) +
    "&kind=" + kind +
    "&parts=" + totalParts +
    "&filename=" + encodeURIComponent(safeName) +
    "&size=" + file.size +
    "&mime=" + encodeURIComponent(contentType)
  );
}

async function uploadImageAsset(slug: string, kind: "cover" | "hero", file: File): Promise<string> {
  if (file.size > MAX_GAME_FILE_BYTES) {
    throw new Error("Arquivo muito grande. O limite do GameHub é 50 MB por arquivo.");
  }

  const user = auth.currentUser;
  if (!user) throw new Error("Faça login antes de enviar arquivos.");

  const idToken = await user.getIdToken();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const response = await fetch(
    "/api/game-upload?slug=" + encodeURIComponent(slug) +
      "&kind=" + kind + "&filename=" + encodeURIComponent(safeName),
    {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + idToken,
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(file.size),
      },
      body: file,
    },
  );

  const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? ("Falha no upload de " + kind + "."));
  }
  return result.url;
}

export async function uploadGameAsset(
  slug: string,
  kind: "cover" | "hero" | "game" | "game-mobile",
  file: File,
  onProgress?: (completed: number, total: number) => void,
): Promise<string> {
  if (!auth.currentUser) throw new Error("Faça login antes de enviar o jogo.");
  if (kind === "game" || kind === "game-mobile") return uploadGameFile(slug, file, kind, onProgress);
  return uploadImageAsset(slug, kind, file);
}