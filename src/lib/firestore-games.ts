import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/firebase";
import type { Game } from "@/data/games";

export type GameDocument = Game & {
  gameType?: "internal" | "url" | "html";
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

export async function uploadGameAsset(
  slug: string,
  kind: "cover" | "hero" | "game",
  file: File,
): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Configure VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  const resourceType = kind === "game" ? "raw" : "image";
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", `gamehub/games/${slug}`);
  body.append("public_id", kind === "game" ? "game" : kind);

  const response = await fetch(endpoint, { method: "POST", body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message ?? "Falha no upload para o Cloudinary.");
  }
  return result.secure_url as string;
}