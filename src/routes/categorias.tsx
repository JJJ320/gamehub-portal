import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";

import { categoryIcons } from "@/components/category-sidebar";
import { GameCard } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { categories, gamesByCategory } from "@/data/games";

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias de Jogos — GameHub" },
      {
        name: "description",
        content:
          "Navegue por categorias no GameHub: Ação, Aventura, Terror, Corrida, Multiplayer, Puzzle e Esportes.",
      },
      { property: "og:title", content: "Categorias de Jogos — GameHub" },
      {
        property: "og:description",
        content: "Sete categorias para encontrar exatamente o tipo de jogo que você quer jogar.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Início</Link> / Categorias
        </nav>
        <h1 className="mt-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">
          Categorias
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha um estilo e veja o catálogo filtrado na hora.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.icon] ?? Swords;
            return (
              <Link
                key={cat.slug}
                to="/jogos"
                search={{ cat: cat.slug, q: undefined }}
                className="group rounded-xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow"
              >
                <span className="grid size-11 place-items-center rounded-lg bg-surface-2 text-primary transition-colors group-hover:bg-gradient-violet group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-3 font-display text-lg font-bold">{cat.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-primary">
                  {gamesByCategory(cat.slug).length} jogos
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 space-y-10">
          {categories.map((cat) => {
            const list = gamesByCategory(cat.slug);
            if (list.length === 0) return null;
            return (
              <section key={cat.slug}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="min-w-0 truncate font-display text-xl font-extrabold uppercase">
                    {cat.name}
                  </h2>
                  <Link
                    to="/jogos"
                    search={{ cat: cat.slug, q: undefined }}
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  >
                    Ver tudo
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
                  {list.slice(0, 6).map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
