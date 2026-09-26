import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase";

export type FavoriteRecord = {
  id: string;
  user_id: string;
  game_slug: string;
  created_at?: Date;
  updated_at?: Date;
};

const favoritesCollection = collection(db, "favorites");

function favoriteId(userId: string, gameSlug: string) {
  return `${userId}__${gameSlug}`;
}

export async function listFavorites(userId: string): Promise<FavoriteRecord[]> {
  const snapshot = await getDocs(
    query(favoritesCollection, where("user_id", "==", userId)),
  );

  return snapshot.docs.map((item) => {
    const data = item.data();

    return {
      id: item.id,
      user_id: data.user_id as string,
      game_slug: data.game_slug as string,
      created_at: data.created_at?.toDate?.(),
      updated_at: data.updated_at?.toDate?.(),
    };
  });
}

export async function addFavorite(userId: string, gameSlug: string) {
  const id = favoriteId(userId, gameSlug);

  await setDoc(doc(favoritesCollection, id), {
    user_id: userId,
    game_slug: gameSlug,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function removeFavorite(userId: string, gameSlug: string) {
  await deleteDoc(doc(favoritesCollection, favoriteId(userId, gameSlug)));
}
