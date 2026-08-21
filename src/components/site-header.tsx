import { Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2, Menu, Search, User, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Início", to: "/" },
  { label: "Todos os Jogos", to: "/jogos" },
  { label: "Categorias", to: "/categorias" },
  { label: "Mais Jogados", to: "/mais-jogados" },
  { label: "Novos Jogos", to: "/novos" },
] as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/jogos", search: { q: query.trim() || undefined, cat: undefined } });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 group">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-violet shadow-glow transition-transform group-hover:scale-105">
            <Gamepad2 className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            GAME<span className="text-gradient-violet">HUB</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <form onSubmit={submit} className="hidden min-w-0 sm:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar jogos..."
                aria-label="Buscar jogos"
                className="h-10 w-40 rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:w-56 focus:border-primary/60 focus:ring-2 focus:ring-ring/30 md:w-52 md:focus:w-72"
              />
            </div>
          </form>
          <Button variant="hero" size="sm" className="hidden sm:inline-flex">
            <User className="size-4" /> Entrar
          </Button>
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-secondary lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border/70 bg-background/95 lg:hidden",
          open ? "max-h-96" : "max-h-0",
          "transition-[max-height] duration-300",
        )}
      >
        <div className="space-y-2 px-4 py-4">
          <form onSubmit={submit} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jogos..."
              aria-label="Buscar jogos"
              className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
          </form>
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="hero" className="w-full">
            <User className="size-4" /> Entrar
          </Button>
        </div>
      </div>
    </header>
  );
}
