import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { GameType } from "@/lib/firestore-games";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/hooks/use-auth";
import { categories, games as legacyGames, type CategorySlug } from "@/data/games";
import {
  deleteGame,
  listOwnerGames,
  saveGame,
  uploadGameAsset,
  type GameDocument,
} from "@/lib/firestore-games";

export const Route = createFileRoute("/admin/jogos")({ ssr: false, component: AdminGames });

const emptyGame = (): GameDocument => ({
  id: crypto.randomUUID(),
  slug: "",
  title: "",
  genre: "Arcade",
  categories: ["acao"],
  rating: 5,
  plays: 0,
  cover: "",
  hero: "",
  shortDescription: "",
  description: "",
  developer: "GameHub",
  releaseYear: new Date().getFullYear(),
  platforms: ["Web"],
  tags: [],
  playable: true,
  featured: false,
  isNew: true,
  gameType: "html",
  gameUrl: "",
  published: true,
});

function AdminGames() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [ownerGames, setOwnerGames] = useState<GameDocument[]>([]);
  const [form, setForm] = useState<GameDocument>(emptyGame());
  const [tagText, setTagText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [gameFile, setGameFile] = useState<File | null>(null);

  const reload = async () => setOwnerGames(await listOwnerGames());

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", search: { redirect: "/admin/jogos" }, replace: true });
      return;
    }
    if (user) void reload().catch(() => setMessage("NÃ£o foi possÃ­vel carregar os jogos."));
  }, [loading, user, navigate]);

  const edit = (game: GameDocument) => {
    setForm({ ...game });
    setTagText(game.tags.join(", "));
    setCoverFile(null);
    setHeroFile(null);
    setGameFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!form.title.trim() || !form.slug.trim()) {
      setMessage("TÃ­tulo e slug sÃ£o obrigatÃ³rios.");
      return;
    }

    setBusy(true);
    try {
      let next = { ...form, slug: form.slug.trim().toLowerCase(), title: form.title.trim() };
      if (coverFile) next.cover = await uploadGameAsset(next.slug, "cover", coverFile);
      if (heroFile) next.hero = await uploadGameAsset(next.slug, "hero", heroFile);
      if (gameFile) {
        const extension = gameFile.name.toLowerCase().split(".").pop();
        next.gameType = extension === "zip" ? "zip" : "html";
        next.gameUrl = await uploadGameAsset(next.slug, "game", gameFile);
      }
      next.tags = tagText.split(",").map((tag) => tag.trim()).filter(Boolean);
      next.playable = Boolean(next.gameUrl) || next.gameType === "internal";
      await saveGame(next);
      setMessage("Jogo salvo no Firebase.");
      await reload();
      setForm(emptyGame());
      setTagText("");
    } catch (error) {
      console.error(error);
      setMessage("Erro ao salvar. Verifique se sua conta estÃ¡ cadastrada em owners.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (slug: string) => {
    if (!confirm(`Excluir "${slug}" do catÃ¡logo?`)) return;
    try {
      await deleteGame(slug);
      await reload();
      setMessage("Jogo excluÃ­do.");
    } catch (error) {
      console.error(error);
      setMessage("NÃ£o foi possÃ­vel excluir.");
    }
  };

  const importLegacy = async () => {
    setBusy(true);
    try {
      for (const game of legacyGames) {
        await saveGame({
          ...game,
          published: true,
          gameType: game.slug === "flappy-pombo" ? "internal" : "url",
          gameUrl: game.embedUrl ?? "",
        });
      }
      await reload();
      setMessage("CatÃ¡logo inicial importado para o Firestore.");
    } catch (error) {
      console.error(error);
      setMessage("ImportaÃ§Ã£o bloqueada. Cadastre seu UID em owners no Firestore.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-4xl px-4 py-20">Carregando...</main></div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">InÃ­cio</Link>
            <h1 className="mt-2 font-display text-3xl font-extrabold uppercase">Gerenciar jogos</h1>
            <p className="mt-1 text-sm text-muted-foreground">CatÃ¡logo modular do GameHub â€” Firebase Firestore + Storage.</p>
          </div>
          <Button variant="outline" onClick={importLegacy} disabled={busy}><Upload className="size-4" /> Importar catÃ¡logo atual</Button>
        </div>

        <form onSubmit={save} className="mt-6 grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="TÃ­tulo" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="flappy-pombo" />
            <Field label="GÃªnero" value={form.genre} onChange={(v) => setForm({ ...form, genre: v })} />
            <Field label="Desenvolvedor" value={form.developer} onChange={(v) => setForm({ ...form, developer: v })} />
            <Field label="DescriÃ§Ã£o curta" value={form.shortDescription} onChange={(v) => setForm({ ...form, shortDescription: v })} />
            <Field label="URL do jogo (se jÃ¡ hospedado)" value={form.gameUrl ?? ""} onChange={(v) => setForm({ ...form, gameUrl: v, gameType: "url" })} />
          </div>

          <div>
            <Label>DescriÃ§Ã£o</Label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-28 w-full rounded-lg border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Capa</Label><Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Banner / hero</Label><Input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)} /></div>
                        <div>
              <Label>Arquivo do jogo</Label>
              <Input
                type="file"
                accept={form.gameType === "zip" ? ".zip,application/zip" : ".html,.htm,text/html"}
                onChange={(e) => setGameFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                HTML para jogos de arquivo único ou ZIP para jogos com JS, CSS, imagens e outros assets.
              </p>
            </div>
            <div><Label>Tags</Label><Input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Arcade, Original, Web" /></div>
          </div>

          <div>
            <Label>Categorias</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => {
                const selected = form.categories.includes(category.slug);
                return <button key={category.slug} type="button" onClick={() => setForm({ ...form, categories: selected ? form.categories.filter((x) => x !== category.slug) : [...form.categories, category.slug] as CategorySlug[] })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface"}`}>{category.name}</button>;
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="hero" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar jogo</Button>
            <Button type="button" variant="outline" onClick={() => setForm(emptyGame())}><Plus className="size-4" /> Novo</Button>
          </div>
          {message && <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">{message}</p>}
        </form>

        <section className="mt-8 space-y-3">
          {ownerGames.map((game) => (
            <div key={game.slug} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
              <img src={game.cover} alt="" className="size-14 rounded-lg object-cover bg-surface" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{game.title}</p><p className="text-xs text-muted-foreground">{game.slug} Â· {game.published ? "publicado" : "rascunho"}</p></div>
              {game.slug === "flappy-pombo" && <Check className="size-4 text-primary" />}
              <Button size="sm" variant="outline" onClick={() => edit(game)}>Editar</Button>
              <Button size="sm" variant="outline" onClick={() => void remove(game.slug)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div><Label>{label}</Label><Input className="mt-1 bg-surface" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}



