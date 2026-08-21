import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, TrendingUp } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatPlays, games } from "@/data/games";

export const Route = createFileRoute("/mais-jogados")({
  head: () => ({
    meta: [
      { title: "Mais Jogados — Ranking GameHub" },
      {
        name: "description",
        content:
          "Ranking dos jogos mais jogados do GameHub, ordenado por número de partidas do catálogo demonstrativo.",
      },
      { property: "og:title", content: "Mais Jogados — Ranking GameHub" },
      {
        property: "og:description",
        content: "Veja quais jogos lideram o ranking de partidas no GameHub.",
      },
    ],
  }),
  component: MostPlayedPage,
});

function MostPlayedPage() {
  const ranking = [...games].sort((a, b) => b.plays - a.plays);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Início</Link> / Mais Jogados
        </nav>
        <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">
          <TrendingUp className="size-7 shrink-0 text-primary" /> Mais Jogados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranking por número de partidas (dados demonstrativos).
        </p>

        <ol className="mt-6 grid gap-2">
          {ranking.map((game, i) => (
            <li key={game.id}>
              <Link
                to="/jogo/$slug"
                params={{ slug: game.slug }}
                className="group grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-all hover:border-primary/60 hover:shadow-glow sm:gap-4 sm:p-4"
              >
                <span className="w-8 shrink-0 text-center font-display text-2xl font-extrabold text-muted-foreground group-hover:text-primary sm:text-3xl">
                  {i + 1}
                </span>
                <img
                  src={game.cover}
                  alt={`Capa demonstrativa de ${game.title}`}
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="size-16 shrink-0 rounded-lg object-cover sm:size-20"
                />
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-bold sm:text-lg">
                    {game.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground sm:text-sm">
                    {game.genre}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-xs font-bold text-gold">
                    <Star className="size-3 fill-current" /> {game.rating.toFixed(1)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-base font-bold sm:text-lg">
                    {formatPlays(game.plays)}
                  </span>
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                    partidas
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
