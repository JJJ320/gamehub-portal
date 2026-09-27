import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Gamepad2, Heart, Info, Lock, Play, Star, Tag, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GameCard } from "@/components/game-card";
import { GamePlayer } from "@/components/game-player";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { categories, formatPlays } from "@/data/games";
import { getPlayableGame } from "@/games/registry";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { getUserGameData, recordGamePlay, setGameFavorite, setGameRating, type UserGameData } from "@/lib/user-game-data";

export const Route = createFileRoute("/jogo/$slug")({ ssr: false, component: GameDetailPage });

function GameDetailPage() {
  const { slug } = Route.useParams();
  const games = useGames();
  const { user } = useAuth();
  const game = games.find((g) => g.slug === slug);
  const [playing, setPlaying] = useState(false);
  const [gameData, setGameData] = useState<UserGameData>({ gameSlug: slug, favorite: false, playTimeSeconds: 0 });
  const [rating, setRating] = useState(0);
  const [savingGameData, setSavingGameData] = useState(false);
  const playStartedAt = useRef<number | null>(null);
  const PlayableGame = game ? getPlayableGame(game.slug) : undefined;

  useEffect(() => {
    if (playing) {
      document.getElementById("area-de-jogo")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [playing]);

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
    playStartedAt.current = Date.now();

    return () => {
      const started = playStartedAt.current;
      playStartedAt.current = null;
      if (!started) return;
      const seconds = Math.floor((Date.now() - started) / 1000);
      if (seconds > 0) {
        void recordGamePlay(user.uid, game.slug, seconds).catch((error) =>
          console.error("Falha ao registrar tempo de jogo:", error),
        );
      }
    };
  }, [playing, user, game?.slug]);

  const toggleFavorite = async () => {
    if (!user || !game || savingGameData) return;
    const next = !gameData.favorite;
    setGameData((current) => ({ ...current, favorite: next }));
    setSavingGameData(true);
    try {
      await setGameFavorite(user.uid, game.slug, next);
    } catch (error) {
      setGameData((current) => ({ ...current, favorite: !next }));
      console.error("Falha ao salvar favorito:", error);
    } finally {
      setSavingGameData(false);
    }
  };

  const rateGame = async (value: number) => {
    if (!user || !game || savingGameData) return;
    setRating(value);
    setGameData((current) => ({ ...current, rating: value }));
    setSavingGameData(true);
    try {
      await setGameRating(user.uid, game.slug, value);
    } catch (error) {
      setRating(gameData.rating ?? 0);
      setGameData((current) => ({ ...current, rating: gameData.rating }));
      console.error("Falha ao salvar avaliação:", error);
    } finally {
      setSavingGameData(false);
    }
  };

  if (!game) {
    return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="font-display text-3xl font-extrabold">Jogo não encontrado</h1><Button className="mt-6" asChild><Link to="/jogos" search={{ q: undefined, cat: undefined }}>Ver jogos</Link></Button></main><SiteFooter /></div>;
  }

  const categoryNames = game.categories.map((slug) => categories.find((category) => category.slug === slug)?.name).filter(Boolean).join(" · ");
  const related = games.filter((item) => item.id !== game.id && item.categories.some((category) => game.categories.includes(category))).slice(0, 6);
  const canPlay = Boolean(game.playable && (PlayableGame || game.gameUrl));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="relative">
        <div className="relative z-0 h-56 overflow-hidden sm:h-80">
          <img src={game.hero ?? game.cover} alt={game.title} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </div>
        <main className="relative z-10 mx-auto -mt-24 max-w-7xl px-4 pb-4 sm:px-6">
          <nav className="relative text-xs text-muted-foreground">
            <Link to="/">Início</Link> / <Link to="/jogos" search={{ q: undefined, cat: undefined }}>Jogos</Link> / {game.title}
          </nav>

          <div className="mt-4 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <img src={game.cover} alt={game.title} className="w-40 rounded-xl border border-border/70 object-cover sm:w-52 lg:w-full" />
            <div>
              <h1 className="font-display text-3xl font-extrabold uppercase sm:text-5xl">{game.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{game.genre} · {categoryNames}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Stat icon={<Star className="size-3.5 fill-current text-gold" />} label={`${game.rating.toFixed(1)} de nota`} />
                <Stat icon={<Users className="size-3.5" />} label={`${formatPlays(game.plays)} partidas`} />
                <Stat icon={<CalendarDays className="size-3.5" />} label={String(game.releaseYear)} />
                <Stat icon={<Tag className="size-3.5" />} label={game.developer} />
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground/85 sm:text-base">{game.description}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                {canPlay ? <Button variant="hero" size="xl" onClick={() => setPlaying(true)}><Play className="fill-current" /> JOGAR AGORA</Button> : <Button size="xl" disabled><Lock /> JOGAR AGORA</Button>}
                <Button variant="outlineGlow" size="xl" asChild><Link to="/jogos" search={{ cat: game.categories[0], q: undefined }}>Ver similares</Link></Button>
                {user && (
                  <Button
                    variant="outline"
                    size="xl"
                    onClick={toggleFavorite}
                    disabled={savingGameData}
                    aria-pressed={gameData.favorite}
                  >
                    <Heart className={gameData.favorite ? "fill-current text-primary" : ""} />
                    {gameData.favorite ? "FAVORITO" : "FAVORITAR"}
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
                        disabled={savingGameData}
                        className="rounded-md p-1 text-gold transition-transform hover:scale-110 disabled:opacity-50"
                        aria-label={`Avaliar com ${value} estrela${value > 1 ? "s" : ""}`}
                      >
                        <Star className={value <= rating ? "size-6 fill-current" : "size-6"} />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {rating ? `${rating}/5` : "Ainda não avaliado"}
                    </span>
                  </div>
                </div>
              )}

              {!canPlay && <div className="mt-4 flex gap-3 rounded-xl border border-border/70 bg-surface/60 p-4"><Info className="size-4 shrink-0 text-primary" /><p className="text-xs text-muted-foreground">Este jogo ainda não possui uma versão jogável configurada.</p></div>}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoBox title="Plataformas" items={game.platforms} />
                <InfoBox title="Tags" items={game.tags} />
              </div>
            </div>
          </div>

          {canPlay && (
            <section id="area-de-jogo" className="mt-10">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold uppercase"><Gamepad2 className="size-5 text-primary" /> Jogar no GameHub</h2>
              {playing ? (
                <GamePlayer>
                  {PlayableGame ? <PlayableGame /> : <iframe src={game.gameUrl} title={game.title} className="size-full border-0" allow="fullscreen; autoplay" />}
                </GamePlayer>
              ) : (
                <div className="grid place-items-center rounded-2xl border border-border/70 bg-surface/60 p-10 text-center">
                  <p className="text-sm text-muted-foreground">Clique em JOGAR AGORA para iniciar.</p>
                  <Button variant="hero" size="xl" className="mt-4" onClick={() => setPlaying(true)}><Play className="fill-current" /> Iniciar partida</Button>
                </div>
              )}
            </section>
          )}

          {related.length > 0 && <section className="mt-12"><h2 className="mb-4 font-display text-xl font-extrabold uppercase">Você também pode gostar</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{related.map((item) => <GameCard key={item.id} game={item} />)}</div></section>}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface px-3 py-1.5 text-xs font-semibold">{icon}{label}</span>;
}

function InfoBox({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border border-border/70 bg-card p-4"><h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3><div className="mt-2 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-md bg-surface-2 px-2.5 py-1 text-xs">{item}</span>)}</div></div>;
}