import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/firebase";
import type { Game } from "@/data/games";

export type GameType = "internal" | "url" | "html" | "zip";

export type GameDocument = Game & {
  gameType?: GameType;
  gameUrl?: string;
  published?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const gamesCollection = collection(db, "games");
const MAX_GAME_FILE_BYTES = 50 * 1024 * 1024;

export async function listPublishedGames(): Promise<GameDocument[]> {
  const snapshot = await getDocs(query(gamesCollection, where("published", "==", true)));
  return snapshot.docs.map((item) => item.data() as GameDocument);
}

export async function listOwnerGames(): Promise<GameDocument[]> {
  const snapshot = await getDocs(gamesCollection);
  return snapshot.docs.map((item) => item.data() as GameDocument);
}

export async function getGameDocument(slug: string): Promise<GameDocument | null> {
  const snapshot = await getDocs(query(gamesCollection, where("slug", "==", slug)));
  const item = snapshot.docs[0];
  return item ? (item.data() as GameDocument) : null;
}

export async function saveGame(game: GameDocument): Promise<void> {
  await setDoc(
    doc(db, "games", game.slug),
    { ...game, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

async function deleteGameAssets(slug: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Faça login antes de excluir o jogo.");

  const idToken = await user.getIdToken();
  const response = await fetch(`/api/game-assets?slug=${encodeURIComponent(slug)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error ?? "Falha ao excluir os arquivos do jogo.");
  }
}

export async function deleteGame(slug: string): Promise<void> {
  await deleteGameAssets(slug);
  await deleteDoc(doc(db, "games", slug));
}

async function uploadGameFile(slug: string, file: File): Promise<string> {
  if (file.size > MAX_GAME_FILE_BYTES) {
    throw new Error("Arquivo muito grande. O limite do GameHub é 50 MB por arquivo.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login antes de enviar o jogo.");
  }

  const idToken = await user.getIdToken();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const response = await fetch(
    `/api/game-upload?slug=${encodeURIComponent(slug)}&kind=game&filename=${encodeURIComponent(safeName)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(file.size),
      },
      body: file,
    },
  );

  const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? "Falha no upload do jogo.");
  }

  return result.url;
}

async function uploadImageAsset(
  slug: string,
  kind: "cover" | "hero",
  file: File,
): Promise<string> {
  if (file.size > MAX_GAME_FILE_BYTES) {
    throw new Error("Arquivo muito grande. O limite do GameHub é 50 MB por arquivo.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login antes de enviar arquivos.");
  }

  const idToken = await user.getIdToken();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const response = await fetch(
    `/api/game-upload?slug=${encodeURIComponent(slug)}&kind=${kind}&filename=${encodeURIComponent(safeName)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(file.size),
      },
      body: file,
    },
  );

  const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? `Falha no upload de ${kind}.`);
  }

  return result.url;
}

export async function uploadGameAsset(
  slug: string,
  kind: "cover" | "hero" | "game",
  file: File,
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error("Faça login antes de enviar o jogo.");
  }

  if (kind === "game") {
    return uploadGameFile(slug, file);
  }

  return uploadImageAsset(slug, kind, file);
}