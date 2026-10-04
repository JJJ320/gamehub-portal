import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

const SITE_URL = "https://gamehub-portal.pages.dev";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { GameGrid } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { categories, getCategory } from "@/data/games";
import { searchCatalog, useGames } from "@/hooks/use-games";
import { cn } from "@/lib/utils";

type GamesSearch = { q: string | undefined; cat: string | undefined };

const CATALOG_TITLE = "Todos os Jogos — Jogos Online Grátis | GameHub";
const CATALOG_DESCRIPTION = "Explore todos os jogos online grátis do GameHub. Busque por nome ou navegue por categorias, gêneros e estilos para jogar direto no navegador.";

export const Route = createFileRoute("/jogos")({  validateSearch: (s: Record<string, unknown>): GamesSearch => ({ q: typeof s.q === "string" ? s.q : undefined, cat: typeof s.cat === "string" ? s.cat : undefined }), component: AllGames, head: () => {
 const category = undefined;
 const title = category ? category.name + " — Jogos Online Grátis | GameHub" : CATALOG_TITLE;
 const description = category ? category.description + " Encontre e jogue jogos de " + category.name.toLowerCase() + " online grátis no GameHub." : CATALOG_DESCRIPTION;
 const url = category ? SITE_URL + "/jogos?cat=" + encodeURIComponent(category.slug) : SITE_URL + "/jogos";
 const breadcrumb = {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Início",item:SITE_URL+"/"},{"@type":"ListItem",position:2,name:category?.name ?? "Todos os Jogos",item:url}]};
 const collection = {"@context":"https://schema.org","@type":"CollectionPage",name:title,description,url,inLanguage:"pt-BR"};
 return {meta:[{title},{name:"description",content:description},{name:"robots",content:"index, follow, max-image-preview:large"},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:type",content:"website"},{property:"og:url",content:url},{property:"og:site_name",content:"GameHub"},{name:"twitter:card",content:"summary_large_image"},{name:"twitter:title",content:title},{name:"twitter:description",content:description}],links:[{rel:"canonical",href:url},{rel:"alternate",hrefLang:"pt-BR",href:url}],scripts:[{type:"application/ld+json",children:JSON.stringify(breadcrumb)},{type:"application/ld+json",children:JSON.stringify(collection)}]};
} });

function AllGames() {
  const { q, cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/jogos" });
  const games = useGames();
  const [term, setTerm] = useState(q ?? "");
  const results = searchCatalog(games, q ?? "", cat);
  const active = cat ? getCategory(cat) : undefined;

  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <nav className="text-xs text-muted-foreground"><Link to="/">Início</Link> / Todos os Jogos</nav>
    <h1 className="mt-2 font-display text-3xl font-extrabold uppercase">{active?.name ?? "Todos os Jogos"}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{active?.description ?? "Catálogo carregado do Firebase Firestore."}</p>
    <form onSubmit={(e) => { e.preventDefault(); void navigate({ search: { q: term.trim() || undefined, cat } }); }} className="mt-6 flex gap-3">
      <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar jogos..." className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm outline-none focus:border-primary/60" />{term && <button type="button" onClick={() => { setTerm(""); void navigate({ search: { q: undefined, cat } }); }} className="absolute right-2 top-1/2"><X className="size-4" /></button>}</div>
      <button className="h-11 rounded-lg bg-gradient-violet px-6 text-sm font-semibold text-primary-foreground">Buscar</button>
    </form>
    <div className="mt-4 flex flex-wrap gap-2"><Filter label="Todos" active={!cat} search={{ q, cat: undefined }} />{categories.map((c) => <Filter key={c.slug} label={c.name} active={cat === c.slug} search={{ q, cat: c.slug }} />)}</div>
    <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">{results.length} {results.length === 1 ? "jogo" : "jogos"}</p>
    <div className="mt-4"><GameGrid games={results} /></div>
  </main><SiteFooter /></div>;
}
function Filter({ label, active, search }: { label: string; active: boolean; search: GamesSearch }) {
  return <Link to="/jogos" search={search} className={cn("rounded-full border px-4 py-1.5 text-xs font-semibold", active ? "bg-gradient-violet text-primary-foreground" : "border-border bg-surface text-muted-foreground")}>{label}</Link>;
}
