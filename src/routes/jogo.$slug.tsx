import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarDays, Info, Lock, Play, Star, Tag, Users } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  categories,
  formatPlays,
  games,
  getGameBySlug,
} from "@/data/games";

export const Route = createFileRoute("/jogo/$slug")({
  loader: ({ params }) => {
    const game = getGameBySlug(params.slug);
    if (!game) throw notFound();
    return { game };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Jogo não encontrado — GameHub" }, { name: "robots", content: "noindex" }],
      };
    }
    const { game } = loaderData;
    return {
      meta: [
        { title: `${game.title} — GameHub` },
        { name: "description", content: game.shortDescription },
        { property: "og:title", content: `${game.title} — GameHub` },
        { property: "og:description", content: game.shortDescription },
      ],
    };
  },
  notFoundComponent: GameNotFound,
  component: GameDetail,
});

function GameNotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-extrabold uppercase">Jogo não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esse título não está no catálogo demonstrativo.
        </p>
        <Button variant="hero" className="mt-6" asChild>
          <Link to="/jogos" search={{ q: undefined, cat: undefined }}>Ver todos os jogos</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}

function GameDetail() {
  const { game } = Route.useLoaderData();
  const related = games
    .filter((g) => g.id !== game.id && g.categories.some((c) => game.categories.includes(c)))
    .slice(0, 6);
  const categoryNames = game.categories
    .map((slug) => categories.find((c) => c.slug === slug)?.name)
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="relative">
        <div className="relative h-56 overflow-hidden sm:h-80">
          <img
            src={game.hero ?? game.cover}
            alt={`Arte demonstrativa de ${game.title}`}
            width={1600}
            height={900}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </div>

        <main className="mx-auto -mt-24 max-w-7xl px-4 pb-4 sm:px-6">
          <nav className="relative text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Início</Link> /{" "}
            <Link to="/jogos" search={{ q: undefined, cat: undefined }} className="hover:text-primary">Todos os Jogos</Link> / {game.title}
          </nav>

          <div className="mt-4 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <img
              src={game.cover}
              alt={`Capa demonstrativa de ${game.title}`}
              width={800}
              height={1000}
              className="w-40 rounded-xl border border-border/70 object-cover shadow-card sm:w-52 lg:w-full"
            />

            <div className="min-w-0">
              <h1 className="font-display text-3xl font-extrabold uppercase sm:text-5xl">
                {game.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {game.genre} · {categoryNames}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Stat icon={<Star className="size-3.5 fill-current text-gold" />} label={`${game.rating.toFixed(1)} de nota`} />
                <Stat icon={<Users className="size-3.5" />} label={`${formatPlays(game.plays)} partidas`} />
                <Stat icon={<CalendarDays className="size-3.5" />} label={String(game.releaseYear)} />
                <Stat icon={<Tag className="size-3.5" />} label={game.developer} />
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/85 sm:text-base">
                {game.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {game.playable ? (
                  <Button variant="hero" size="xl">
                    <Play className="fill-current" /> JOGAR AGORA
                  </Button>
                ) : (
                  <Button size="xl" disabled title="Sem versão web autorizada disponível">
                    <Lock /> JOGAR AGORA
                  </Button>
                )}
                <Button variant="outlineGlow" size="xl" asChild>
                  <Link to="/jogos" search={{ cat: game.categories[0], q: undefined }}>
                    Ver similares
                  </Link>
                </Button>
              </div>

              {!game.playable && (
                <div className="mt-4 flex max-w-2xl items-start gap-3 rounded-xl border border-border/70 bg-surface/60 p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Este título ainda não possui versão web autorizada no GameHub, por isso o botão
                    de jogar está desabilitado. Nenhum arquivo protegido é hospedado ou distribuído
                    aqui — a página é demonstrativa de catálogo.
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoBox title="Plataformas" items={game.platforms} />
                <InfoBox title="Tags" items={game.tags} />
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-xl font-extrabold uppercase">
                Você também pode gostar
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
                {related.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface px-3 py-1.5 text-xs font-semibold">
      {icon}
      {label}
    </span>
  );
}

function InfoBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground/85"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
