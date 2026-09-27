import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Heart, Loader2, LogOut, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useGames } from "@/hooks/use-games";
import { listUserGameData, type UserGameData } from "@/lib/user-game-data";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase";

export const Route = createFileRoute("/perfil")({
  ssr: false,

  head: () => ({
    meta: [
      { title: "Meu perfil — GameHub" },
      {
        name: "description",
        content:
          "Gerencie seu perfil GameHub: nome de exibição, avatar e o espaço reservado para favoritos e histórico.",
      },
      {
        property: "og:title",
        content: "Meu perfil — GameHub",
      },
      {
        property: "og:description",
        content: "Área de conta do portal gamer GameHub.",
      },
      {
        property: "og:type",
        content: "profile",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  component: ProfilePage,
});

const nameSchema = z
  .string()
  .trim()
  .min(2, {
    message: "Informe um nome com pelo menos 2 caracteres",
  })
  .max(60, {
    message: "O nome deve ter no máximo 60 caracteres",
  });

const avatarSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .url({
      message: "Informe uma URL válida de imagem",
    })
    .max(500),
]);

function ProfilePage() {
  const navigate = useNavigate();

  const { user, profile, loading, updateProfileLocal, signOut } = useAuth();
  const games = useGames();
  const [userGames, setUserGames] = useState<UserGameData[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void listUserGameData(user.uid)
      .then(setUserGames)
      .catch((error) => console.error("Falha ao carregar atividade dos jogos:", error));
  }, [user]);

  /*
   * Redireciona usuários não autenticados.
   */
  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/auth",
        search: {
          redirect: "/perfil",
        },
        replace: true,
      });
    }
  }, [loading, user, navigate]);

  /*
   * Carrega os dados do perfil.
   */
  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile?.display_name, profile?.avatar_url]);

  /*
   * Enquanto o Firebase verifica a sessão.
   */
  if (loading || !user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />

        <main className="mx-auto grid max-w-7xl place-items-center px-4 py-24">
          <div className="flex flex-col items-center">
            <Loader2 className="size-6 animate-spin text-primary" />

            <p className="mt-3 text-sm text-muted-foreground">Carregando seu perfil...</p>
          </div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  /*
   * Firebase usa user.uid em vez de user.uid.
   *
   * O nome pode existir nos metadados da conta, mas
   * preferimos usar o perfil salvo no banco.
   */
  const fallbackName =
    profile?.["display_name"] ??
    (typeof user.user_metadata?.["display_name"] === "string"
      ? user.user_metadata["display_name"]
      : null) ??
    user.email ??
    "G";

  const initials = fallbackName.slice(0, 2).toUpperCase();

  /*
   * Salvar perfil.
   */
  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({});
    setStatus(null);

    const nameResult = nameSchema.safeParse(displayName);

    const avatarResult = avatarFile ? { success: true as const, data: avatarUrl.trim() } : avatarSchema.safeParse(avatarUrl.trim());

    const next: Record<string, string> = {};

    if (!nameResult.success) {
      next["displayName"] = nameResult.error.issues[0]?.message ?? "Nome inválido";
    }

    if (!avatarResult.success) {
      next["avatarUrl"] = avatarResult.error.issues[0]?.message ?? "URL do avatar inválida";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    /*
     * Como o Zod já validou os dados, aqui eles são strings.
     */
    const nameValue = nameResult.data;
    let avatarValue = avatarResult.data;

    setSaving(true);

    try {
      /*
       * Atualiza os metadados do usuário no Firebase Auth.
       */
      if (avatarFile) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) throw new Error("O upload de imagens não está configurado.");
        const body = new FormData();
        body.append("file", avatarFile);
        body.append("upload_preset", uploadPreset);
        body.append("folder", "gamehub/avatars");
        const response = await fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload", { method: "POST", body });
        const result = await response.json();
        if (!response.ok || !result.secure_url) throw new Error(result.error?.message ?? "Falha no upload da foto.");
        avatarValue = result.secure_url as string;
      }
      await updateProfile(user, {
        displayName: nameValue,
        photoURL: avatarValue || null,
      });

      /*
       * Atualiza o perfil na tabela profiles.
       *
       * IMPORTANTE:
       * Firebase usa user.uid.
       * Firebase usava user.uid.
       */
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          id: user.uid,
          display_name: nameValue,
          avatar_url: avatarValue || null,
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );

      /*
       * Recarrega o perfil pelo AuthContext.
       */
      setAvatarUrl(avatarValue);
      setAvatarFile(null);
      updateProfileLocal({ display_name: nameValue, avatar_url: avatarValue || null });

      setStatus({
        kind: "ok",
        text: "Perfil atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro inesperado ao salvar perfil:", error);

      setStatus({
        kind: "error",
        text: "Ocorreu um erro ao salvar. Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  /*
   * Logout pelo Firebase.
   */
  const handleSignOut = async () => {
    try {
      await signOut();

      navigate({
        to: "/",
        replace: true,
      });
    } catch (error) {
      console.error("Erro ao sair da conta:", error);

      setStatus({
        kind: "error",
        text: "Não foi possível sair da conta. Tente novamente.",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Início
          </Link>{" "}
          / Meu perfil
        </nav>

        {/* CABEÇALHO DO PERFIL */}
        <header className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`Avatar de ${profile.display_name ?? "usuário"}`}
                className="size-16 shrink-0 rounded-xl border border-border object-cover"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-gradient-violet font-display text-xl font-extrabold text-primary-foreground shadow-glow">
                {initials}
              </span>
            )}

            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-extrabold uppercase sm:text-3xl">
                {profile?.display_name ?? "Jogador GameHub"}
              </h1>

              <p className="truncate text-sm text-muted-foreground">{user.email ?? "Sem e-mail"}</p>
            </div>
          </div>

          <Button variant="outline" asChild className="sm:ml-auto"><Link to="/admin/jogos">Gerenciar jogos</Link></Button>

          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={saving}
          >
            <LogOut className="size-4" />
            Sair da conta
          </Button>
        </header>

        {/* CONTEÚDO */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* DADOS DO PERFIL */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
            <h2 className="font-display text-lg font-bold uppercase">Dados do perfil</h2>

            <form onSubmit={save} className="mt-4 space-y-4" noValidate>
              {/* NOME */}
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Nome de exibição</Label>

                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  aria-invalid={Boolean(errors["displayName"])}
                  className="bg-surface"
                />

                {errors["displayName"] && (
                  <p className="text-xs text-destructive">{errors["displayName"]}</p>
                )}
              </div>

              {/* EMAIL */}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>

                <Input id="email" value={user.email ?? ""} disabled className="bg-surface" />

                <p className="text-xs text-muted-foreground">
                  O e-mail da conta não pode ser alterado aqui.
                </p>
              </div>

              {/* AVATAR */}
              <div className="space-y-1.5">
                <Label htmlFor="avatarFile">Foto de perfil</Label>
                <Input
                  id="avatarFile"
                  type="file"
                  accept="image/*"
                  className="bg-surface"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      setErrors((prev) => ({ ...prev, avatarUrl: "A imagem deve ter no máximo 5 MB." }));
                      e.target.value = "";
                      return;
                    }
                    setErrors((prev) => ({ ...prev, avatarUrl: "" }));
                    setAvatarFile(file);
                  }}
                />
                <p className="text-xs text-muted-foreground">Escolha uma imagem de até 5 MB ou informe uma URL abaixo.</p>
                <Label htmlFor="avatarUrl">URL da foto (opcional)</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  placeholder="https://..."
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setAvatarFile(null);
                  }}
                  aria-invalid={Boolean(errors["avatarUrl"])}
                  className="bg-surface"
                />
                {errors["avatarUrl"] && <p className="text-xs text-destructive">{errors["avatarUrl"]}</p>}
                {(avatarFile || avatarUrl) && (
                  <img
                    src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl}
                    alt="Prévia da foto de perfil"
                    className="size-20 rounded-xl border border-border object-cover"
                  />
                )}
              </div>
              {/* SALVAR */}
              <Button type="submit" variant="hero" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar alterações
              </Button>

              {/* STATUS */}
              {status && (
                <p
                  role={status.kind === "error" ? "alert" : "status"}
                  className={
                    status.kind === "error"
                      ? "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      : "rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground"
                  }
                >
                  {status.text}
                </p>
              )}
            </form>
          </section>

          {/* SIDEBAR */}
          <aside className="space-y-6">
            <UserGamesCard
              title="Favoritos"
              icon={<Heart className="size-5 text-primary" />}
              items={userGames.filter((item) => item.favorite)}
              games={games}
              emptyText="Você ainda não favoritou nenhum jogo."
            />
            <UserGamesCard
              title="Histórico"
              icon={<Clock className="size-5 text-primary" />}
              items={[...userGames].filter((item) => item.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? "")).slice(0, 6)}
              games={games}
              emptyText="Seu histórico aparecerá aqui quando você jogar."
            />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function UserGamesCard({
  icon,
  title,
  items,
  games,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  items: UserGameData[];
  games: ReturnType<typeof useGames>;
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-base font-bold uppercase">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const game = games.find((candidate) => candidate.slug === item.gameSlug);
            if (!game) return null;
            const minutes = Math.floor(item.playTimeSeconds / 60);
            return (
              <Link
                key={item.gameSlug}
                to="/jogo/$slug"
                params={{ slug: game.slug }}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface/60 p-2.5 transition-colors hover:border-primary/50"
              >
                <img src={game.cover} alt="" className="size-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{game.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {minutes > 0 ? `${minutes} min de jogo` : "Ainda sem tempo registrado"}
                    {item.rating ? ` · ${item.rating}/5` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}