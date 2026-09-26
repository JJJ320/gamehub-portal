import { useEffect, useState } from "react";
import { games as legacyGames, type Game } from "@/data/games";
import { listPublishedGames, type GameDocument } from "@/lib/firestore-games";

let catalogCache: GameDocument[] | null = null;

export function useGames() {
  const [games, setGames] = useState<GameDocument[]>(catalogCache ?? legacyGames);

  useEffect(() => {
    let active = true;
    void listPublishedGames()
      .then((remote) => {
        if (!active) return;
        catalogCache = remote.length > 0 ? remote : legacyGames;
        setGames(catalogCache);
      })
      .catch((error) => {
        console.error("Falha ao carregar catálogo Firebase:", error);
        if (active) setGames(legacyGames);
      });

    return () => {
      active = false;
    };
  }, []);

  return games;
}

export function useGame(slug: string) {
  const games = useGames();
  return games.find((game) => game.slug === slug) ?? null;
}

export function searchCatalog(games: GameDocument[], query: string, category?: string) {
  const q = query.trim().toLowerCase();
  return games.filter((game) => {
    const categoryMatch =
      !category || category === "all" || game.categories.includes(category as Game["categories"][number]);
    if (!categoryMatch) return false;
    if (!q) return true;
    return (
      game.title.toLowerCase().includes(q) ||
      game.genre.toLowerCase().includes(q) ||
      game.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}
