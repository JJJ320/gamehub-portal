import { Link } from "@tanstack/react-router";
import {
  Car,
  Compass,
  Ghost,
  Puzzle,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { categories, gamesByCategory } from "@/data/games";

const icons: Record<string, LucideIcon> = {
  Swords,
  Compass,
  Ghost,
  Car,
  Users,
  Puzzle,
  Trophy,
};

export function CategorySidebar() {
  return (
    <aside className="rounded-xl border border-border/70 bg-card p-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Categorias
      </h2>
      <nav className="mt-3 grid gap-1">
        {categories.map((cat) => {
          const Icon = icons[cat.icon] ?? Swords;
          return (
            <Link
              key={cat.slug}
              to="/jogos"
              search={{ cat: cat.slug, q: undefined }}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-primary transition-colors group-hover:bg-gradient-violet group-hover:text-primary-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{cat.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {gamesByCategory(cat.slug).length}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export { icons as categoryIcons };
