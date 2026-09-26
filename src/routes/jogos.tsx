import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { GameGrid } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { categories, getCategory } from "@/data/games";
import { searchCatalog, useGames } from "@/hooks/use-games";
import { cn } from "@/lib/utils";

type GamesSearch = { q: string | undefined; cat: string | undefined };
export const Route = createFileRoute("/jogos")({ ssr: false, validateSearch: (s: Record<string, unknown>): GamesSearch => ({ q: typeof s.q === "string" ? s.q : undefined, cat: typeof s.cat === "string" ? s.cat : undefined }), component: AllGames });

function AllGames() {
  const { q, cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/jogos" });
  const games = useGames();
  const [term, setTerm] = useState(q ?? "");
  const results = searchCatalog(games, q ?? "", cat);
  const active = cat ? getCategory(cat) : undefined;

  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <nav className="text-xs text-muted-foreground"><Link to="/">Início</Link> / Todos os Jogos</nav>
    <h1 className="mt-2 font-display text-3xl font-extrabold uppercase">{active?.name ?? "Todos os Jogos"}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{active?.description ?? "Catálogo carregado do Firebase Firestore."}</p>
    <form onSubmit={(e) => { e.preventDefault(); void navigate({ search: { q: term.trim() || undefined, cat } }); }} className="mt-6 flex gap-3">
      <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar jogos..." className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm outline-none focus:border-primary/60" />{term && <button type="button" onClick={() => { setTerm(""); void navigate({ search: { q: undefined, cat } }); }} className="absolute right-2 top-1/2"><X className="size-4" /></button>}</div>
      <button className="h-11 rounded-lg bg-gradient-violet px-6 text-sm font-semibold text-primary-foreground">Buscar</button>
    </form>
    <div className="mt-4 flex flex-wrap gap-2"><Filter label="Todos" active={!cat} search={{ q, cat: undefined }} />{categories.map((c) => <Filter key={c.slug} label={c.name} active={cat === c.slug} search={{ q, cat: c.slug }} />)}</div>
    <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">{results.length} {results.length === 1 ? "jogo" : "jogos"}</p>
    <div className="mt-4"><GameGrid games={results} /></div>
  </main><SiteFooter /></div>;
}
function Filter({ label, active, search }: { label: string; active: boolean; search: GamesSearch }) {
  return <Link to="/jogos" search={search} className={cn("rounded-full border px-4 py-1.5 text-xs font-semibold", active ? "bg-gradient-violet text-primary-foreground" : "border-border bg-surface text-muted-foreground")}>{label}</Link>;
}
