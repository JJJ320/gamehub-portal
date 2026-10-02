import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Gamepad2, Heart, Info, Lock, Play, Star, Tag, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { GameCard } from "@/components/game-card";
import { GamePlayer } from "@/components/game-player";
import { HostedHtmlGame } from "@/components/hosted-html-game";
import { RuffleFlashGame } from "@/components/ruffle-flash-game";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { categories, formatPlays } from "@/data/games";
import { getPlayableGame } from "@/games/registry";
import { useAuth } from "@/hooks/use-auth";
import { useGames } from "@/hooks/use-games";
import {
  getUserGameData,
  listGameRatings,
  recordGamePlay,
  setGameFavorite,
  setGameRating,
  type UserGameData,
} from "@/lib/user-game-data";

export const Route = createFileRoute("/jogo/$slug")({
  ssr: false,
  component: GameDetailPage,
});

function GameDetailPage() {
  const { slug } = Route.useParams();
  const games = useGames();
  const { user, profile } = useAuth();
  const game = games.find((item) => item.slug === slug);

  const [playing, setPlaying] = useState(false);
  const [gameData, setGameData] = useState<UserGameData>({
    gameSlug: slug,
    favorite: false,
    playTimeMs: 0,
    hasPlayed: false,
  });
  const [rating, setRating] = useState(0);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof listGameRatings>>>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const lastPlaySyncAt = useRef<number | null>(null);
  const [liveNow, setLiveNow] = useState(Date.now());

  const PlayableGame = game ? getPlayableGame(game.slug) : undefined;

  useEffect(() => {
    if (!game) return;
    setAverageRating(game.rating ?? 0);
    void listGameRatings(game.slug)
      .then((items) => {
        setReviews(items);
        const sum = items.reduce((total, item) => total + item.rating, 0);
        setAverageRating(items.length ? sum / items.length : 0);
      })
      .catch((error) => console.error("Falha ao carregar avaliações:", error));
  }, [game?.slug]);

  useEffect(() => {
    if (!user || !game) return;
    void getUserGameData(user.uid, game.slug)
      .then((data) => {
        setGameData(data);
        setRating(data.rating ?? 0);
      })
      .catch((error) => console.error("Falha ao carregar dados do jogo:", error));
  }, [user, game?.slug]);

  useEffect(() => {
    if (!playing || !user || !game) return;

    lastPlaySyncAt.current = Date.now();
    setLiveNow(Date.now());

    void recordGamePlay(user.uid, game.slug, 0)
      .then(({ countedAsNewPlayer }) => {
        if (countedAsNewPlayer) {
          window.dispatchEvent(new CustomEvent("gamehub:player-counted", { detail: { slug: game.slug } }));
        }
      })
      .catch((error) => console.error("Falha ao registrar partida:", error));

    const displayInterval = window.setInterval(() => setLiveNow(Date.now()), 50);
    const sync = () => {
      const last = lastPlaySyncAt.current;
      if (!last) return;
      const now = Date.now();
      const milliseconds = now - last;
      if (milliseconds <= 0) return;
      lastPlaySyncAt.current = now;

      void recordGamePlay(user.uid, game.slug, milliseconds)
        .then(() => {
          setGameData((current) => ({
            ...current,
            playTimeMs: current.playTimeMs + milliseconds,
            lastPlayedAt: new Date().toISOString(),
            hasPlayed: true,
          }));
        })
        .catch((error) => console.error("Falha ao registrar tempo de jogo:", error));
    };

    const interval = window.setInterval(sync, 1000);
    return () => {
      window.clearInterval(displayInterval);
      window.clearInterval(interval);
      const last = lastPlaySyncAt.current;
      lastPlaySyncAt.current = null;
      if (last) {
        void recordGamePlay(user.uid, game.slug, Math.max(0, Date.now() - last)).catch((error) =>
          console.error("Falha ao finalizar partida:", error),
        );
      }
    };
  }, [playing, user, game?.slug]);

  if (!game) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-extrabold">Jogo não encontrado</h1>
          <Button className="mt-6" asChild>
            <Link to="/jogos" search={{ q: undefined, cat: undefined }}>Ver jogos</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const categoryNames = game.categories
    .map((category) => categories.find((item) => item.slug === category)?.name)
    .filter(Boolean)
    .join(" · ");

  const related = games
    .filter(
      (item) =>
        item.id !== game.id &&
        item.categories.some((category) => game.categories.includes(category)),
    )
    .slice(0, 6);

  const canPlay = Boolean(game.playable && (PlayableGame || game.gameUrl));

  const toggleFavorite = async () => {
    if (!user || savingFavorite) return;
    const next = !gameData.favorite;
    setGameData((current) => ({ ...current, favorite: next }));
    setSavingFavorite(true);
    try {
      await setGameFavorite(user.uid, game.slug, next);
    } catch (error) {
      setGameData((current) => ({ ...current, favorite: !next }));
      console.error("Falha ao salvar favorito:", error);
    } finally {
      setSavingFavorite(false);
    }
  };

  const rateGame = async (value: number) => {
    if (!user || savingRating) return;
    const safeValue = Math.max(1, Math.min(5, Math.round(value)));
    setRating(safeValue);
    setGameData((current) => ({ ...current, rating: safeValue }));
    setSavingRating(true);
    try {
      await setGameRating(
        user.uid,
        game.slug,
        safeValue,
        profile?.display_name ?? user.displayName ?? "Jogador",
        profile?.avatar_url ?? user.photoURL ?? null,
      );
      const items = await listGameRatings(game.slug);
      setReviews(items);
      const sum = items.reduce((total, item) => total + item.rating, 0);
      setAverageRating(items.length ? sum / items.length : 0);
    } catch (error) {
      console.error("Falha ao salvar avaliação:", error);
    } finally {
      setSavingRating(false);
    }
  };

  const livePlayTimeMs =
    playing && lastPlaySyncAt.current
      ? gameData.playTimeMs + (liveNow - lastPlaySyncAt.current)
      : gameData.playTimeMs;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="relative">
        <div className="relative z-0 h-56 overflow-hidden sm:h-80">
          <img src={game.hero ?? game.cover} alt={game.title} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </div>

        <main className="relative z-10 mx-auto -mt-24 max-w-7xl px-4 pb-4 sm:px-6">
          <nav className="text-xs text-muted-foreground">
            <Link to="/">Início</Link> /{" "}
            <Link to="/jogos" search={{ q: undefined, cat: undefined }}>Jogos</Link> / {game.title}
          </nav>

          <div className="mt-4 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <img src={game.cover} alt={game.title} className="w-40 rounded-xl border border-border/70 object-cover sm:w-52 lg:w-full" />
            <div>
              <h1 className="font-display text-3xl font-extrabold uppercase sm:text-5xl">{game.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{game.genre} · {categoryNames}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Stat icon={<Star className="size-3.5 fill-current text-gold" />} label={averageRating > 0 ? averageRating.toFixed(1) + " de nota" : "Sem avaliações"} />
                <Stat icon={<Users className="size-3.5" />} label={formatPlays(game.plays) + " jogadores"} />
                <Stat icon={<CalendarDays className="size-3.5" />} label={String(game.releaseYear)} />
                <Stat icon={<Tag className="size-3.5" />} label={game.developer} />
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/85 sm:text-base">{game.description}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                {canPlay ? (
                  <Button variant="hero" size="xl" onClick={() => setPlaying(true)}>
                    <Play className="fill-current" /> JOGAR AGORA
                  </Button>
                ) : (
                  <Button size="xl" disabled><Lock /> JOGAR AGORA</Button>
                )}

                <Button variant="outlineGlow" size="xl" asChild>
                  <Link to="/jogos" search={{ cat: game.categories[0], q: undefined }}>Ver similares</Link>
                </Button>

                {user && (
                  <Button variant="outline" size="xl" onClick={() => void toggleFavorite()} disabled={savingFavorite} aria-pressed={gameData.favorite}>
                    <Heart className={gameData.favorite ? "fill-current text-primary" : ""} />
                    {savingFavorite ? "SALVANDO..." : gameData.favorite ? "FAVORITO" : "FAVORITAR"}
                  </Button>
                )}
              </div>

              {user && (
                <div className="mt-5 rounded-xl border border-border/70 bg-surface/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sua avaliação</p>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => void rateGame(value)}
                        disabled={savingRating}
                        className="rounded-md p-1 text-gold transition-transform hover:scale-110 disabled:opacity-50"
                        aria-label={"Avaliar com " + value + " estrela" + (value > 1 ? "s" : "")}
                      >
                        <Star className={value <= rating ? "size-6 fill-current" : "size-6"} />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {rating ? String(rating) + "/5" : "Ainda não avaliado"}
                    </span>
                  </div>
                </div>
              )}

              {!canPlay && (
                <div className="mt-4 flex gap-3 rounded-xl border border-border/70 bg-surface/60 p-4">
                  <Info className="size-4 shrink-0 text-primary" />
                  <p className="text-xs text-muted-foreground">Este jogo ainda não possui uma versão jogável configurada.</p>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoBox title="Plataformas" items={game.platforms} />
                <InfoBox title="Tags" items={game.tags} />
              </div>
            </div>
          </div>

          {canPlay && (
            <section id="area-de-jogo" className="mt-10">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold uppercase">
                <Gamepad2 className="size-5 text-primary" /> Jogar no GameHub
              </h2>
              {playing ? (
                <>
                  <div className="mb-3 flex justify-end">
                    <span className="rounded-lg border border-border/70 bg-surface/80 px-3 py-1.5 font-mono text-sm tabular-nums text-muted-foreground">
                      Tempo: {formatPlayTime(livePlayTimeMs)}
                    </span>
                  </div>
                  <GamePlayer>
                    {PlayableGame ? (
                      <PlayableGame />
                    ) : game.gameUrl && game.gameType === "flash" ? (
                      <RuffleFlashGame url={game.gameUrl} title={game.title} />
                    ) : game.gameUrl && (game.gameType === "html" || game.gameType === "zip") ? (
                      <HostedHtmlGame url={game.gameUrl} type={game.gameType} title={game.title} />
                    ) : (
                      <iframe src={game.gameUrl} title={game.title} className="size-full border-0" allow="fullscreen; autoplay; gamepad" />
                    )}
                  </GamePlayer>
                </>
              ) : (
                <div className="grid place-items-center rounded-2xl border border-border/70 bg-surface/60 p-10 text-center">
                  <p className="text-sm text-muted-foreground">Clique em JOGAR AGORA para iniciar.</p>
                  <Button variant="hero" size="xl" className="mt-4" onClick={() => setPlaying(true)}>
                    <Play className="fill-current" /> Iniciar partida
                  </Button>
                </div>
              )}
            </section>
          )}

          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold uppercase">Avaliações</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reviews.length
                    ? String(reviews.length) + (reviews.length === 1 ? " avaliação" : " avaliações") + " · média real " + averageRating.toFixed(1) + "/5"
                    : "Este jogo ainda não recebeu avaliações."}
                </p>
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-2">
                  <Star className="size-5 fill-current text-gold" />
                  <span className="font-display text-2xl font-extrabold">{averageRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">/ 5</span>
                </div>
              )}
            </div>

            {reviews.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                  <div key={review.userId} className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="flex items-center gap-3">
                      {review.avatarUrl ? (
                        <img src={review.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                      ) : (
                        <div className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-bold">
                          {review.displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{review.displayName}</p>
                        <div className="mt-1 flex items-center gap-1 text-gold">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} className={index < review.rating ? "size-3.5 fill-current" : "size-3.5"} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{review.rating}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-xl font-extrabold uppercase">Você também pode gostar</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {related.map((item) => <GameCard key={item.id} game={item} />)}
              </div>
            </section>
          )}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

function formatPlayTime(milliseconds: number): string {
  const safeMs = Math.max(0, Math.floor(milliseconds));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1_000);
  const ms = safeMs % 1_000;
  if (hours > 0) return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") + "." + String(ms).padStart(3, "0");
  return minutes + ":" + String(seconds).padStart(2, "0") + "." + String(ms).padStart(3, "0");
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface px-3 py-1.5 text-xs font-semibold">{icon}{label}</span>;
}

function InfoBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => <span key={item} className="rounded-md bg-surface-2 px-2.5 py-1 text-xs">{item}</span>)}
      </div>
    </div>
  );
}
