import { Link } from "@tanstack/react-router";
import { Play, Star, Users } from "lucide-react";

import { formatPlays, type Game } from "@/data/games";
import { cn } from "@/lib/utils";

export function GameCard({ game, className }: { game: Game; className?: string }) {
  return (
    <Link
      to="/jogo/$slug"
      params={{ slug: game.slug }}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border/70 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow",
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={game.cover}
          alt={`Capa demonstrativa de ${game.title}`}
          loading="lazy"
          width={800}
          height={1000}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 overlay-fade" />
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-bold text-gold backdrop-blur">
          <Star className="size-3 fill-current" /> {game.rating.toFixed(1)}
        </span>
        <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-gradient-violet shadow-glow">
            <Play className="size-5 fill-current text-primary-foreground" />
          </span>
        </span>
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-bold tracking-tight transition-colors group-hover:text-primary">
          {game.title}
        </h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{game.genre}</p>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" /> {formatPlays(game.plays)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function GameGrid({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
        <p className="font-display text-lg font-bold">Nenhum jogo encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tente outro termo de busca ou selecione outra categoria.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
