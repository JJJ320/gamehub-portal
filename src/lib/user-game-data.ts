import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";

export type UserGameData = {
  gameSlug: string;
  favorite: boolean;
  playTimeSeconds: number;
  lastPlayedAt?: string;
  rating?: number;
};

function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Timestamp | undefined;
  return timestamp && typeof timestamp.toDate === "function"
    ? timestamp.toDate().toISOString()
    : undefined;
}

function gameRef(userId: string, slug: string) {
  return doc(db, "userGames", userId, "games", slug);
}

export async function getUserGameData(
  userId: string,
  slug: string,
): Promise<UserGameData> {
  const snapshot = await getDoc(gameRef(userId, slug));

  if (!snapshot.exists()) {
    return { gameSlug: slug, favorite: false, playTimeSeconds: 0 };
  }

  const data = snapshot.data();

  return {
    gameSlug: slug,
    favorite: data.favorite === true,
    playTimeSeconds:
      typeof data.playTimeSeconds === "number" ? data.playTimeSeconds : 0,
    lastPlayedAt: timestampToIso(data.lastPlayedAt),
    rating: typeof data.rating === "number" ? data.rating : undefined,
  };
}

export async function setGameFavorite(
  userId: string,
  slug: string,
  favorite: boolean,
): Promise<void> {
  await setDoc(
    gameRef(userId, slug),
    {
      gameSlug: slug,
      favorite,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function recordGamePlay(
  userId: string,
  slug: string,
  additionalSeconds: number,
): Promise<void> {
  const seconds = Math.max(0, Math.round(additionalSeconds));

  // increment() evita perda de tempo quando duas atualizações acontecem
  // quase ao mesmo tempo e também permite criar o registro do histórico
  // assim que a partida começa.
  await setDoc(
    gameRef(userId, slug),
    {
      gameSlug: slug,
      playTimeSeconds: increment(seconds),
      lastPlayedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setGameRating(
  userId: string,
  slug: string,
  rating: number,
): Promise<void> {
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));

  await setDoc(
    gameRef(userId, slug),
    {
      gameSlug: slug,
      rating: safeRating,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listUserGameData(
  userId: string,
): Promise<UserGameData[]> {
  const snapshot = await getDocs(
    collection(db, "userGames", userId, "games"),
  );

  return snapshot.docs.map((item) => {
    const data = item.data();

    return {
      gameSlug: item.id,
      favorite: data.favorite === true,
      playTimeSeconds:
        typeof data.playTimeSeconds === "number" ? data.playTimeSeconds : 0,
      lastPlayedAt: timestampToIso(data.lastPlayedAt),
      rating: typeof data.rating === "number" ? data.rating : undefined,
    };
  });
}
