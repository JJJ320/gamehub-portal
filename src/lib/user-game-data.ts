import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  runTransaction,
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
  hasPlayed: boolean;
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

function ratingRef(slug: string, userId: string) {
  return doc(db, "gameRatings", slug, "ratings", userId);
}

export async function getUserGameData(userId: string, slug: string): Promise<UserGameData> {
  const snapshot = await getDoc(gameRef(userId, slug));
  if (!snapshot.exists()) {
    return { gameSlug: slug, favorite: false, playTimeMs: 0, hasPlayed: false };
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
    hasPlayed: data.hasPlayed === true,
  };
}

export async function setGameFavorite(userId: string, slug: string, favorite: boolean): Promise<void> {
  await setDoc(
    gameRef(userId, slug),
    { gameSlug: slug, favorite, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function recordGamePlay(
  userId: string,
  slug: string,
  additionalMs: number,
): Promise<{ countedAsNewPlayer: boolean }> {
  const milliseconds = Math.max(0, Math.round(additionalMs));
  let countedAsNewPlayer = false;

  await runTransaction(db, async (transaction) => {
    const userRef = gameRef(userId, slug);
    const gameDocumentRef = doc(db, "games", slug);
    const userSnapshot = await transaction.get(userRef);
    const gameSnapshot = await transaction.get(gameDocumentRef);

    if (!gameSnapshot.exists()) throw new Error("Jogo não encontrado.");

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const gameData = gameSnapshot.data();
    const alreadyPlayed = userData.hasPlayed === true;
    const initialized = gameData.metricsInitialized === true;

    transaction.set(
      userRef,
      {
        gameSlug: slug,
        playTimeMs: increment(milliseconds),
        lastPlayedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        hasPlayed: true,
      },
      { merge: true },
    );

    if (!alreadyPlayed) {
      countedAsNewPlayer = true;
      transaction.update(
        gameDocumentRef,
        initialized
          ? { plays: increment(1), uniquePlayers: increment(1) }
          : {
              plays: 1,
              uniquePlayers: 1,
              metricsInitialized: true,
              rating: 0,
              ratingSum: 0,
              ratingCount: 0,
            },
      );
    }
  });

  return { countedAsNewPlayer };
}

export async function setGameRating(
  userId: string,
  slug: string,
  rating: number,
  displayName: string,
  avatarUrl: string | null,
): Promise<void> {
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));

  await runTransaction(db, async (transaction) => {
    const userRef = gameRef(userId, slug);
    const gameDocumentRef = doc(db, "games", slug);
    const publicRatingRef = ratingRef(slug, userId);

    const userSnapshot = await transaction.get(userRef);
    const gameSnapshot = await transaction.get(gameDocumentRef);
    const publicRatingSnapshot = await transaction.get(publicRatingRef);

    if (!gameSnapshot.exists()) throw new Error("Jogo não encontrado.");

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const gameData = gameSnapshot.data();
    const initialized = gameData.metricsInitialized === true;
    const previousRating =
      typeof userData.rating === "number" ? userData.rating : undefined;

    const previousSum = initialized && typeof gameData.ratingSum === "number"
      ? gameData.ratingSum
      : 0;
    const previousCount = initialized && typeof gameData.ratingCount === "number"
      ? gameData.ratingCount
      : 0;

    let nextSum = previousSum;
    let nextCount = previousCount;

    if (previousRating === undefined) {
      nextSum += safeRating;
      nextCount += 1;
    } else if (previousRating !== safeRating) {
      nextSum += safeRating - previousRating;
    }

    const nextAverage = nextCount > 0 ? nextSum / nextCount : 0;

    transaction.set(
      userRef,
      { gameSlug: slug, rating: safeRating, updatedAt: serverTimestamp() },
      { merge: true },
    );

    transaction.set(
      publicRatingRef,
      {
        userId,
        gameSlug: slug,
        rating: safeRating,
        displayName: displayName.trim() || "Jogador",
        avatarUrl: avatarUrl || null,
        createdAt: publicRatingSnapshot.exists()
          ? publicRatingSnapshot.data().createdAt ?? serverTimestamp()
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    transaction.update(gameDocumentRef, {
      metricsInitialized: true,
      ratingSum: nextSum,
      ratingCount: nextCount,
      rating: Number(nextAverage.toFixed(2)),
    });
  });
}

export async function listGameRatings(slug: string) {
  const snapshot = await getDocs(collection(db, "gameRatings", slug, "ratings"));

  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        userId: item.id,
        rating: typeof data.rating === "number" ? data.rating : 0,
        displayName:
          typeof data.displayName === "string" && data.displayName.trim()
            ? data.displayName
            : "Jogador",
        avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : null,
        createdAt: timestampToIso(data.createdAt),
      };
    })
    .filter((item) => item.rating >= 1 && item.rating <= 5)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function listUserGameData(userId: string): Promise<UserGameData[]> {
  const snapshot = await getDocs(collection(db, "userGames", userId, "games"));

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
      hasPlayed: data.hasPlayed === true,
    };
  });
}
