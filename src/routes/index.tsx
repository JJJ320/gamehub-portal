import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Play, Sparkles, Star, TrendingUp } from "lucide-react";
import { CategorySidebar } from "@/components/category-sidebar";
import { GameCard } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { categories, formatPlays } from "@/data/games";
import { useGames } from "@/hooks/use-games";

export const Route = createFileRoute("/")({ ssr: false, component: Home });

function Home() {
  const games = useGames();
  const hero = games.find((g) => g.featured) ?? games[0];
  const ranking = [...games].sort((a, b) => b.plays - a.plays).slice(0, 5);
  const featured = games.filter((g) => g.featured).slice(0, 6);
  const newest = games.filter((g) => g.isNew).slice(0, 6);

  if (!hero) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-20">Carregando catálogo...</main></div>;

  return <div className="min-h-screen">
    <SiteHeader />
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="relative min-h-[380px] overflow-hidden rounded-2xl border border-border/70 shadow-card sm:min-h-[440px]">
          <img src={hero.hero ?? hero.cover} alt={hero.title} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="relative flex h-full flex-col justify-end gap-4 p-6 sm:p-9">
            <span className="flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary"><Flame className="size-3.5" /> Destaque</span>
            <h1 className="max-w-xl text-4xl font-extrabold uppercase leading-none sm:text-6xl">{hero.title}</h1>
            <p className="max-w-xl text-sm text-foreground/80 sm:text-base">{hero.shortDescription}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="hero" size="xl" asChild><Link to="/jogo/$slug" params={{ slug: hero.slug }}><Play className="fill-current" /> JOGAR AGORA</Link></Button>
              <span className="flex items-center gap-1 font-bold text-gold"><Star className="size-4 fill-current" /> {hero.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase"><TrendingUp className="size-4 text-primary" /> Mais Jogados</h2>
          <ol className="mt-3 grid gap-2">{ranking.map((game, i) => <li key={game.id}><Link to="/jogo/$slug" params={{ slug: game.slug }} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary"><span className="w-5 text-center font-bold text-muted-foreground">{i + 1}</span><img src={game.cover} alt="" className="size-12 rounded-md object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{game.title}</span><span className="block truncate text-xs text-muted-foreground">{game.genre}</span></span><span className="text-xs text-muted-foreground">{formatPlays(game.plays)}</span></Link></li>)}</ol>
        </div>
      </section>
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-10">
          <Section title="Jogos em Destaque" icon={<Star className="size-4 text-primary" />} games={featured} />
          <Section title="Novos Jogos" icon={<Sparkles className="size-4 text-primary" />} games={newest} />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start"><CategorySidebar /></div>
      </div>
    </main>
    <SiteFooter />
  </div>;
}

function Section({ title, icon, games }: { title: string; icon: React.ReactNode; games: ReturnType<typeof useGames> }) {
  return <section><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-xl font-extrabold uppercase">{icon}{title}</h2><Link to="/jogos" search={{ q: undefined, cat: undefined }} className="text-xs text-primary hover:underline">Ver mais</Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{games.map((game) => <GameCard key={game.id} game={game} />)}</div></section>;
}
