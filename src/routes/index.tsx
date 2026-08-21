import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Play, Sparkles, Star, TrendingUp } from "lucide-react";

import { CategorySidebar } from "@/components/category-sidebar";
import { GameCard } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  featuredGames,
  formatPlays,
  heroGame,
  mostPlayedGames,
  newGames,
} from "@/data/games";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GameHub — Portal de Jogos Online" },
      {
        name: "description",
        content:
          "GameHub reúne os jogos mais jogados do momento: terror, ação, corrida, multiplayer e mais. Catálogo demonstrativo com destaques, ranking e novidades.",
      },
      { property: "og:title", content: "GameHub — Portal de Jogos Online" },
      {
        property: "og:description",
        content:
          "Descubra destaques, ranking de mais jogados e novidades no portal gamer GameHub.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const hero = heroGame();
  const ranking = mostPlayedGames();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* HERO + RANKING */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div className="relative min-h-[380px] overflow-hidden rounded-2xl border border-border/70 shadow-card sm:min-h-[440px]">
            <img
              src={hero.hero ?? hero.cover}
              alt={`Arte de destaque demonstrativa de ${hero.title}`}
              width={1600}
              height={900}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            <div className="relative flex h-full flex-col justify-end gap-4 p-6 sm:p-9">
              <span className="flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur">
                <Flame className="size-3.5" /> Destaque da semana
              </span>
              <h1 className="max-w-xl text-4xl font-extrabold uppercase leading-none sm:text-6xl">
                {hero.title}
              </h1>
              <p className="max-w-xl text-sm text-foreground/80 sm:text-base">
                {hero.shortDescription}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/jogo/$slug" params={{ slug: hero.slug }}>
                    <Play className="fill-current" /> JOGAR AGORA
                  </Link>
                </Button>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 font-bold text-gold">
                    <Star className="size-4 fill-current" /> {hero.rating.toFixed(1)}
                  </span>
                  <span>{hero.genre}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex min-w-0 items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
                <TrendingUp className="size-4 shrink-0 text-primary" />
                <span className="truncate">Mais Jogados</span>
              </h2>
              <Link to="/mais-jogados" className="shrink-0 text-xs font-medium text-primary hover:underline">
                ver todos
              </Link>
            </div>
            <ol className="mt-3 grid gap-2">
              {ranking.map((game, i) => (
                <li key={game.id}>
                  <Link
                    to="/jogo/$slug"
                    params={{ slug: game.slug }}
                    className="group flex items-center gap-3 rounded-lg border border-transparent p-2 transition-all hover:border-primary/40 hover:bg-secondary"
                  >
                    <span className="w-5 shrink-0 text-center font-display text-lg font-extrabold text-muted-foreground group-hover:text-primary">
                      {i + 1}
                    </span>
                    <img
                      src={game.cover}
                      alt={`Capa demonstrativa de ${game.title}`}
                      loading="lazy"
                      width={800}
                      height={1000}
                      className="size-12 shrink-0 rounded-md object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{game.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {game.genre}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {formatPlays(game.plays)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CONTEÚDO + SIDEBAR */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-10">
            <Section
              title="Jogos em Destaque"
              icon={<Star className="size-4 text-primary" />}
              to="/jogos"
              games={featuredGames()}
            />
            <Section
              title="Novos Jogos"
              icon={<Sparkles className="size-4 text-primary" />}
              to="/novos"
              games={newGames()}
            />
          </div>
          <div className="lg:sticky lg:top-20 lg:self-start">
            <CategorySidebar />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({
  title,
  icon,
  to,
  games,
}: {
  title: string;
  icon: React.ReactNode;
  to: "/jogos" | "/novos";
  games: ReturnType<typeof featuredGames>;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-xl font-extrabold uppercase tracking-wide sm:text-2xl">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        <Link
          to={to}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          Ver mais
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}
