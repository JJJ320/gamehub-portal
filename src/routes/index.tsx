import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Play, Sparkles, Star, TrendingUp } from "lucide-react";
import { CategorySidebar } from "@/components/category-sidebar";
import { GameCard } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { formatPlays } from "@/data/games";
import { useGames } from "@/hooks/use-games";

export const Route = createFileRoute("/")({ ssr: false, component: Home });

function Home() {
  const games = useGames();
  const hero = games.find((g) => g.featured) ?? games[0];
  const ranking = [...games].sort((a, b) => b.plays - a.plays).slice(0, 5);
  const featured = games.filter((g) => g.featured).slice(0, 6);
  const newest = [...games].filter((g) => Boolean(g.createdAt)).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 6);

  if (!hero) {
    return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">Carregando catálogo...</main></div>;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="relative isolate mx-auto max-w-7xl overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
        <div aria-hidden className="pointer-events-none absolute -left-40 top-0 -z-10 size-[420px] rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-40 top-72 -z-10 size-[420px] rounded-full bg-violet/10 blur-3xl" />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div className="group relative min-h-[380px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card sm:min-h-[440px]">
            <img src={hero.hero ?? hero.cover} alt={hero.title} className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent" />
            <div className="relative flex h-full flex-col justify-end gap-4 p-6 sm:p-9">
              <span className="flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur">
                <Flame className="size-3.5" /> Destaque
              </span>
              <h1 className="max-w-xl text-4xl font-extrabold uppercase leading-none sm:text-6xl">{hero.title}</h1>
              <p className="max-w-xl text-sm leading-6 text-foreground/80 sm:text-base">{hero.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="hero" size="xl" asChild><Link to="/jogo/$slug" params={{ slug: hero.slug }}><Play className="fill-current" /> JOGAR AGORA</Link></Button>
                <span className="flex items-center gap-1 rounded-full bg-background/60 px-3 py-2 text-sm font-bold text-gold backdrop-blur"><Star className="size-4 fill-current" /> {hero.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-card backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase"><TrendingUp className="size-4 text-primary" /> Mais Jogados</h2>
              <Link to="/mais-jogados" className="text-xs font-semibold text-primary hover:underline">Ver ranking</Link>
            </div>
            <ol className="mt-3 grid gap-2">
              {ranking.map((game, i) => (
                <li key={game.id}>
                  <Link to="/jogo/$slug" params={{ slug: game.slug }} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary">
                    <span className="w-5 text-center font-bold text-muted-foreground">{i + 1}</span>
                    <img src={game.cover} alt="" className="size-12 rounded-md object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{game.title}</span><span className="block truncate text-xs text-muted-foreground">{game.genre}</span></span>
                    <span className="text-xs text-muted-foreground">{formatPlays(game.plays)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-10">
            <Section title="Jogos em Destaque" icon={<Star className="size-4 text-primary" />} games={featured} />
            <Section title="Novos Jogos" icon={<Sparkles className="size-4 text-primary" />} games={newest} />
          </div>
          <div className="lg:sticky lg:top-20 lg:self-start"><CategorySidebar /></div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, icon, games }: { title: string; icon: React.ReactNode; games: ReturnType<typeof useGames> }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div><h2 className="flex items-center gap-2 font-display text-xl font-extrabold uppercase">{icon}{title}</h2><p className="mt-1 text-xs text-muted-foreground">{games.length} {games.length === 1 ? "jogo" : "jogos"}</p></div>
        <Link to="/jogos" search={{ q: undefined, cat: undefined }} className="shrink-0 text-xs font-semibold text-primary hover:underline">Ver todos</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{games.map((game) => <GameCard key={game.id} game={game} />)}</div>
    </section>
  );
}
