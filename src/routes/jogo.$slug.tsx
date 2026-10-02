import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Gamepad2,
  Heart,
  Info,
  Lock,
  Play,
  Star,
  Tag,
  Users,
} from "lucide-react";
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
  const { user } = useAuth();
  const game = games.find((g) => g.slug === slug);

  const [playing, setPlaying] = useState(false);
  const [gameData, setGameData] = useState<UserGameData>({
    gameSlug: slug,
    favorite: false,
    playTimeMs: 0,
  });
  const [rating, setRating] = useState(0);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [savingRating, setSavingRating] = useState(false);

  const lastPlaySyncAt = useRef<number | null>(null);
  const [liveNow, setLiveNow] = useState(Date.now());
  const gameDataRequestVersion = useRef(0);

  const PlayableGame = game ? getPlayableGame(game.slug) : undefined;

  useEffect(() => {
    if (playing) {
      document
        .getElementById("area-de-jogo")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [playing]);

  useEffect(() => {
    if (!user || !game) return;

    const requestVersion = ++gameDataRequestVersion.current;

    void getUserGameData(user.uid, game.slug)
      .then((data) => {
        // Se o usuÃ¡rio jÃ¡ interagiu com favorito/avaliaÃ§Ã£o, nÃ£o deixe uma
        // leitura antiga do Firestore sobrescrever o estado otimista.
        if (requestVersion !== gameDataRequestVersion.current) return;
        setGameData(data);
        setRating(data.rating ?? 0);
      })
      .catch((error) =>
        console.error("Falha ao carregar dados do jogo:", error),
      );
  }, [user, game?.slug]);

  useEffect(() => {
    if (!playing || !user || !game) return;

    const now = Date.now();
    lastPlaySyncAt.current = now;
    setLiveNow(now);

    void recordGamePlay(user.uid, game.slug, 0).catch((error) =>
      console.error("Falha ao registrar inÃ­cio da partida:", error),
    );

    const displayInterval = window.setInterval(() => {
      setLiveNow(Date.now());
    }, 50);

    const syncPlayTime = () => {
      const lastSync = lastPlaySyncAt.current;
      if (!lastSync) return;

      const current = Date.now();
      const milliseconds = current - lastSync;
      if (milliseconds <= 0) return;

      lastPlaySyncAt.current = current;

      void recordGamePlay(user.uid, game.slug, milliseconds)
        .then(() => {
          setGameData((currentData) => ({
            ...currentData,
            playTimeMs: currentData.playTimeMs + milliseconds,
            lastPlayedAt: new Date().toISOString(),
          }));
        })
        .catch((error) =>
          console.error("Falha ao registrar tempo de jogo:", error),
        );
    };

    const persistenceInterval = window.setInterval(syncPlayTime, 1000);

    return () => {
      window.clearInterval(displayInterval);
      window.clearInterval(persistenceInterval);

      const lastSync = lastPlaySyncAt.current;
      if (!lastSync) return;

      const milliseconds = Date.now() - lastSync;
      lastPlaySyncAt.current = null;

      if (milliseconds > 0) {
        void recordGamePlay(user.uid, game.slug, milliseconds).catch((error) =>
          console.error("Falha ao registrar tempo de jogo:", error),
        );
      }
    };
  }, [playing, user, game?.slug]);

  const toggleFavorite = async () => {
    if (!user || !game || savingFavorite) return;

    gameDataRequestVersion.current += 1;
    const previous = gameData.favorite;
    const next = !previous;

    setGameData((current) => ({ ...current, favorite: next }));
    setSavingFavorite(true);

    try {
      await setGameFavorite(user.uid, game.slug, next);
    } catch (error) {
      setGameData((current) => ({ ...current, favorite: previous }));
      console.error("Falha ao salvar favorito:", error);
    } finally {
      setSavingFavorite(false);
    }
  };

  const rateGame = async (value: number) => {
    if (!user || !game || savingRating) return;

    gameDataRequestVersion.current += 1;
    const previous = rating;

    setRating(value);
    setGameData((current) => ({ ...current, rating: value }));
    setSavingRating(true);

    try {
      await setGameRating(user.uid, game.slug, value);
    } catch (error) {
      setRating(previous);
      setGameData((current) => ({
        ...current,
        rating: previous || undefined,
      }));
      console.error("Falha ao salvar avaliaÃ§Ã£o:", error);
    } finally {
      setSavingRating(false);
    }
  };

  const livePlayTimeMs =
    playing && lastPlaySyncAt.current
      ? gameData.playTimeMs + (liveNow - lastPlaySyncAt.current)
      : gameData.playTimeMs;

  if (!game) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-extrabold">
            Jogo nÃ£o encontrado
          </h1>
          <Button className="mt-6" asChild>
            <Link to="/jogos" search={{ q: undefined, cat: undefined }}>
              Ver jogos
            </Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const categoryNames = game.categories
    .map(
      (categorySlug) =>
        categories.find((category) => category.slug === categorySlug)?.name,
    )
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

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="relative">
        <div className="relative z-0 h-56 overflow-hidden sm:h-80">
          <img
            src={game.hero ?? game.cover}
            alt={game.title}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </div>

        <main className="relative z-10 mx-auto -mt-24 max-w-7xl px-4 pb-4 sm:px-6">
          <nav className="relative text-xs text-muted-foreground">
            <Link to="/">InÃ­cio</Link> /{" "}
            <Link to="/jogos" search={{ q: undefined, cat: undefined }}>
              Jogos
            </Link>{" "}
            / {game.title}
          </nav>

          <div className="mt-4 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <img
              src={game.cover}
              alt={game.title}
              className="w-40 rounded-xl border border-border/70 object-cover sm:w-52 lg:w-full"
            />

            <div>
              <h1 className="font-display text-3xl font-extrabold uppercase sm:text-5xl">
                {game.title}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                {game.genre} · {categoryNames}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Stat
                  icon={<Star className="size-3.5 fill-current text-gold" />}
                  label={`${game.rating.toFixed(1)} de nota`}
                />
                <Stat
                  icon={<Users className="size-3.5" />}
                  label={`${formatPlays(game.plays)} partidas`}
                />
                <Stat
                  icon={<CalendarDays className="size-3.5" />}
                  label={String(game.releaseYear)}
                />
                <Stat
                  icon={<Tag className="size-3.5" />}
                  label={game.developer}
                />
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/85 sm:text-base">
                {game.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {canPlay ? (
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={() => setPlaying(true)}
                  >
                    <Play className="fill-current" /> JOGAR AGORA
                  </Button>
                ) : (
                  <Button size="xl" disabled>
                    <Lock /> JOGAR AGORA
                  </Button>
                )}

                <Button variant="outlineGlow" size="xl" asChild>
                  <Link
                    to="/jogos"
                    search={{ cat: game.categories[0], q: undefined }}
                  >
                    Ver similares
                  </Link>
                </Button>

                {user && (
                  <Button
                    variant="outline"
                    size="xl"
                    onClick={() => void toggleFavorite()}
                    disabled={savingFavorite}
                    aria-pressed={gameData.favorite}
                  >
                    <Heart
                      className={
                        gameData.favorite ? "fill-current text-primary" : ""
                      }
                    />
                    {savingFavorite
                      ? "SALVANDO..."
                      : gameData.favorite
                        ? "FAVORITO"
                        : "FAVORITAR"}
                  </Button>
                )}
              </div>

              {user && (
                <div className="mt-5 rounded-xl border border-border/70 bg-surface/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Sua avaliaÃ§Ã£o
                  </p>

                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => void rateGame(value)}
                        disabled={savingRating}
                        className="rounded-md p-1 text-gold transition-transform hover:scale-110 disabled:opacity-50"
                        aria-label={`Avaliar com ${value} estrela${value > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={
                            value <= rating
                              ? "size-6 fill-current"
                              : "size-6"
                          }
                        />
                      </button>
                    ))}

                    <span className="ml-2 text-sm text-muted-foreground">
                      {rating ? `${rating}/5` : "Ainda nÃ£o avaliado"}
                    </span>
                  </div>
                </div>
              )}

              {!canPlay && (
                <div className="mt-4 flex gap-3 rounded-xl border border-border/70 bg-surface/60 p-4">
                  <Info className="size-4 shrink-0 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Este jogo ainda nÃ£o possui uma versÃ£o jogÃ¡vel configurada.
                  </p>
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
                      <HostedHtmlGame
                        url={game.gameUrl}
                        type={game.gameType}
                        title={game.title}
                      />
                    ) : (
                      <iframe
                        src={game.gameUrl}
                        title={game.title}
                        className="size-full border-0"
                        allow="fullscreen; autoplay; gamepad"
                      />
                    )}
                  </GamePlayer>
                </>
              ) : (
                <div className="grid place-items-center rounded-2xl border border-border/70 bg-surface/60 p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Clique em JOGAR AGORA para iniciar.
                  </p>
                  <Button
                    variant="hero"
                    size="xl"
                    className="mt-4"
                    onClick={() => setPlaying(true)}
                  >
                    <Play className="fill-current" /> Iniciar partida
                  </Button>
                </div>
              )}
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-xl font-extrabold uppercase">
                VocÃª tambÃ©m pode gostar
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {related.map((item) => (
                  <GameCard key={item.id} game={item} />
                ))}
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

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function Stat({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface px-3 py-1.5 text-xs font-semibold">
      {icon}
      {label}
    </span>
  );
}

function InfoBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md bg-surface-2 px-2.5 py-1 text-xs"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}