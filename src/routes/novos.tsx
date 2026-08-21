import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { GameGrid } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { newGames } from "@/data/games";

export const Route = createFileRoute("/novos")({
  head: () => ({
    meta: [
      { title: "Novos Jogos — GameHub" },
      {
        name: "description",
        content:
          "As adições mais recentes ao catálogo do GameHub: terror, dedução social, sandbox e muito mais.",
      },
      { property: "og:title", content: "Novos Jogos — GameHub" },
      {
        property: "og:description",
        content: "Confira os lançamentos e as novidades recém-adicionadas ao GameHub.",
      },
    ],
  }),
  component: NewGamesPage,
});

function NewGamesPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Início</Link> / Novos Jogos
        </nav>
        <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">
          <Sparkles className="size-7 shrink-0 text-primary" /> Novos Jogos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recém-adicionados ao catálogo demonstrativo do GameHub.
        </p>
        <div className="mt-6">
          <GameGrid games={newGames()} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
