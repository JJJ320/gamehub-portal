import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { categoryIcons } from "@/components/category-sidebar";
import { GameCard } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { categories } from "@/data/games";
import { useGames } from "@/hooks/use-games";

export const Route = createFileRoute("/categorias")({ ssr: false, component: CategoriesPage });

function CategoriesPage() {
  const games = useGames();
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <nav className="text-xs text-muted-foreground"><Link to="/" className="hover:text-primary">Início</Link><span className="mx-2">/</span>Categorias</nav>
    <h1 className="mt-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">Categorias</h1>
    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Explore os jogos por estilo e encontre algo novo para jogar.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.map((cat) => { const Icon=categoryIcons[cat.icon]??Swords; const list=games.filter(g=>g.categories.includes(cat.slug)); return <Link key={cat.slug} to="/jogos" search={{cat:cat.slug,q:undefined}} className="group rounded-xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-card"><span className="grid size-11 place-items-center rounded-lg bg-surface-2 text-primary transition-colors group-hover:bg-gradient-violet group-hover:text-primary-foreground"><Icon className="size-5"/></span><h2 className="mt-3 font-display text-lg font-bold">{cat.name}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{cat.description}</p><p className="mt-3 text-xs font-semibold uppercase tracking-widest text-primary">{list.length} {list.length===1?"jogo":"jogos"}</p></Link>})}</div>
    <div className="mt-12 space-y-10">{categories.map(cat=>{const list=games.filter(g=>g.categories.includes(cat.slug)).slice(0,6);if(!list.length)return null;return <section key={cat.slug}><div className="mb-4 flex items-end justify-between"><h2 className="font-display text-xl font-extrabold uppercase">{cat.name}</h2><Link to="/jogos" search={{cat:cat.slug,q:undefined}} className="text-xs font-semibold text-primary hover:underline">Ver categoria</Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{list.map(g=><GameCard key={g.id} game={g}/>)}</div></section>})}</div>
  </main><SiteFooter/></div>;
}
