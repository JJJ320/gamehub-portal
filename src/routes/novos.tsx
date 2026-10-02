import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { GameGrid } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useGames } from "@/hooks/use-games";

export const Route = createFileRoute("/novos")({ ssr: false, component: NewGamesPage });

function NewGamesPage() {
  const games = [...useGames()]
    .filter((game) => Boolean(game.createdAt))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/">Início</Link> / Novos Jogos
        </nav>
        <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-extrabold uppercase">
          <Sparkles className="size-7 text-primary" /> Novos Jogos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jogos adicionados mais recentemente ao catálogo.
        </p>
        <div className="mt-6">
          <GameGrid games={games} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
