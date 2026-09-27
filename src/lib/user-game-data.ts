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
  playTimeMs: number;
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
    return { gameSlug: slug, favorite: false, playTimeMs: 0 };
  }

  const data = snapshot.data();
  const playTimeMs =
    typeof data.playTimeMs === "number"
      ? Math.max(0, data.playTimeMs)
      : typeof data.playTimeSeconds === "number"
        ? Math.max(0, data.playTimeSeconds * 1000)
        : 0;

  return {
    gameSlug: slug,
    favorite: data.favorite === true,
    playTimeMs,
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
  additionalMs: number,
): Promise<void> {
  const milliseconds = Math.max(0, Math.round(additionalMs));

  // increment() evita perda de tempo quando duas atualizações acontecem
  // quase ao mesmo tempo e também permite criar o registro do histórico
  // assim que a partida começa.
  await setDoc(
    gameRef(userId, slug),
    {
      gameSlug: slug,
      playTimeMs: increment(milliseconds),
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
      playTimeMs:
        typeof data.playTimeMs === "number"
          ? Math.max(0, data.playTimeMs)
          : typeof data.playTimeSeconds === "number"
            ? Math.max(0, data.playTimeSeconds * 1000)
            : 0,
      lastPlayedAt: timestampToIso(data.lastPlayedAt),
      rating: typeof data.rating === "number" ? data.rating : undefined,
    };
  });
}