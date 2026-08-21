import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useState } from "react";

import { GameGrid } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { categories, getCategory, searchGames } from "@/data/games";
import { cn } from "@/lib/utils";

type GamesSearch = { q?: string; cat?: string };

export const Route = createFileRoute("/jogos")({
  validateSearch: (search: Record<string, unknown>): GamesSearch => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    cat: typeof search.cat === "string" && search.cat ? search.cat : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Todos os Jogos — GameHub" },
      {
        name: "description",
        content:
          "Explore o catálogo completo do GameHub com busca por nome e filtros por categoria: ação, terror, corrida, multiplayer, puzzle e mais.",
      },
      { property: "og:title", content: "Todos os Jogos — GameHub" },
      {
        property: "og:description",
        content: "Busque e filtre todo o catálogo demonstrativo de jogos do GameHub.",
      },
    ],
  }),
  component: AllGames,
});

function AllGames() {
  const { q, cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/jogos" });
  const [term, setTerm] = useState(q ?? "");

  const results = searchGames(q ?? "", cat);
  const activeCategory = cat ? getCategory(cat) : undefined;

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: { q: term.trim() || undefined, cat } });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Início</Link> / Todos os Jogos
        </nav>
        <h1 className="mt-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">
          {activeCategory ? activeCategory.name : "Todos os Jogos"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCategory?.description ??
            "Catálogo demonstrativo completo — use a busca e os filtros para encontrar seu próximo jogo."}
        </p>

        <form onSubmit={applySearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por nome, gênero ou tag..."
              aria-label="Buscar jogos no catálogo"
              className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-ring/30"
            />
            {term && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => {
                  setTerm("");
                  navigate({ search: { q: undefined, cat } });
                }}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-lg bg-gradient-violet px-6 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110"
          >
            Buscar
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip label="Todos" active={!cat} search={{ q, cat: undefined }} />
          {categories.map((c) => (
            <FilterChip
              key={c.slug}
              label={c.name}
              active={cat === c.slug}
              search={{ q, cat: c.slug }}
            />
          ))}
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          {results.length} {results.length === 1 ? "jogo" : "jogos"}
          {q ? ` para “${q}”` : ""}
        </p>

        <div className="mt-4">
          <GameGrid games={results} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function FilterChip({
  label,
  active,
  search,
}: {
  label: string;
  active: boolean;
  search: GamesSearch;
}) {
  return (
    <Link
      to="/jogos"
      search={search}
      className={cn(
        "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-transparent bg-gradient-violet text-primary-foreground shadow-glow"
          : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
