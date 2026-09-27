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

export async function deleteGame(slug: string): Promise<void> {
  await deleteDoc(doc(db, "games", slug));
}

async function uploadGameFile(slug: string, file: File): Promise<string> {
  const maxBytes = 100 * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error("Arquivo muito grande. O limite atual do GameHub é 100 MB.");
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Configure VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", `gamehub/games/${slug}`);
  body.append("public_id", file.name);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    {
      method: "POST",
      body,
    },
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message ?? "Falha no upload do jogo para o Cloudinary.");
  }

  return result.secure_url as string;
}

async function uploadImageAsset(
  slug: string,
  kind: "cover" | "hero",
  file: File,
): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Configure VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", `gamehub/games/${slug}`);
  body.append("public_id", kind);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body,
    },
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message ?? "Falha no upload para o Cloudinary.");
  }

  return result.secure_url as string;
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
