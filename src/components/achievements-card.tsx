import { Award, Clock3, Gamepad2, Heart, Star, Trophy, Lock } from "lucide-react";
import type { UserGameData } from "@/lib/user-game-data";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  unlocked: boolean;
  progress: number;
  target: number;
};

export function AchievementsCard({ items }: { items: UserGameData[] }) {
  const played = items.filter((item) => item.hasPlayed);
  const totalPlayTime = items.reduce((sum, item) => sum + item.playTimeMs, 0);
  const ratings = items.filter((item) => typeof item.rating === "number");
  const favorites = items.filter((item) => item.favorite);

  const achievements: Achievement[] = [
    { id: "first-game", title: "Primeira partida", description: "Jogue seu primeiro jogo.", icon: Gamepad2, unlocked: played.length >= 1, progress: Math.min(played.length, 1), target: 1 },
    { id: "explorer", title: "Explorador", description: "Experimente 3 jogos diferentes.", icon: Award, unlocked: played.length >= 3, progress: Math.min(played.length, 3), target: 3 },
    { id: "collector", title: "Colecionador", description: "Jogue 10 jogos diferentes.", icon: Trophy, unlocked: played.length >= 10, progress: Math.min(played.length, 10), target: 10 },
    { id: "hour", title: "Uma horinha", description: "Acumule 1 hora de jogo.", icon: Clock3, unlocked: totalPlayTime >= 3_600_000, progress: Math.min(totalPlayTime, 3_600_000), target: 3_600_000 },
    { id: "critic", title: "Crítico", description: "Avalie seu primeiro jogo.", icon: Star, unlocked: ratings.length >= 1, progress: Math.min(ratings.length, 1), target: 1 },
    { id: "favorite", title: "Meu xodó", description: "Adicione um jogo aos favoritos.", icon: Heart, unlocked: favorites.length >= 1, progress: Math.min(favorites.length, 1), target: 1 },
  ];

  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes >= 60 ? Math.floor(minutes / 60) + "h " + (minutes % 60) + "min" : minutes + "min";
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h2 className="font-display text-base font-bold uppercase">Conquistas</h2>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{unlockedCount}/{achievements.length}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Desbloqueie conquistas enquanto joga no GameHub.</p>
      <div className="mt-4 space-y-3">
        {achievements.map((achievement) => {
          const Icon = achievement.icon;
          const percent = Math.round((achievement.progress / achievement.target) * 100);
          return (
            <div key={achievement.id} className={`flex gap-3 rounded-xl border p-3 ${achievement.unlocked ? "border-primary/40 bg-primary/5" : "border-border/70 bg-surface/50"}`}>
              <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${achievement.unlocked ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {achievement.unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold">{achievement.title}</p>
                  {achievement.unlocked && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-primary">Desbloqueada</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{achievement.description}</p>
                {!achievement.unlocked && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: percent + "%" }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {achievement.id === "hour" ? formatTime(achievement.progress) + " / 1h" : achievement.progress + " / " + achievement.target}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
