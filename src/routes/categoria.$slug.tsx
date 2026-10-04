import { createFileRoute, Link } from "@tanstack/react-router";
import { GameGrid } from "@/components/game-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { categories, getCategory } from "@/data/games";
import { useGames } from "@/hooks/use-games";

const SITE_URL = "https://gamehub-portal.pages.dev";

export const Route = createFileRoute("/categoria/$slug")({
  component: CategoryPage,
  head: ({ params }) => {
    const category = getCategory(params.slug);
    if (!category) return { meta: [{ title: "Categoria não encontrada — GameHub" }, { name: "robots", content: "noindex, follow" }] };
    const title = category.name + " — Jogos Online Grátis | GameHub";
    const description = category.description + " Encontre e jogue jogos de " + category.name.toLowerCase() + " online grátis no GameHub.";
    const url = SITE_URL + "/categoria/" + category.slug;
    const breadcrumb = { "@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Início",item:SITE_URL+"/"},{"@type":"ListItem",position:2,name:"Categorias",item:SITE_URL+"/categorias"},{"@type":"ListItem",position:3,name:category.name,item:url}] };
    const collection = { "@context":"https://schema.org","@type":"CollectionPage",name:title,description,url,inLanguage:"pt-BR",about:{"@type":"Thing",name:category.name} };
    return { meta:[{title},{name:"description",content:description},{name:"robots",content:"index, follow, max-image-preview:large, max-snippet:-1"},{property:"og:site_name",content:"GameHub"},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:type",content:"website"},{property:"og:url",content:url},{property:"og:image",content:SITE_URL+"/logo-gamehub.png"},{name:"twitter:card",content:"summary_large_image"},{name:"twitter:title",content:title},{name:"twitter:description",content:description}],links:[{rel:"canonical",href:url},{rel:"alternate",hrefLang:"pt-BR",href:url}],scripts:[{type:"application/ld+json",children:JSON.stringify(breadcrumb)},{type:"application/ld+json",children:JSON.stringify(collection)}] };
  }
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const category = getCategory(slug);
  const games = useGames();
  if (!category) return <div className="min-h-screen"><SiteHeader/><main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><h1 className="font-display text-3xl font-extrabold">Categoria não encontrada</h1><Link to="/categorias" className="mt-4 inline-block text-primary hover:underline">Ver todas as categorias</Link></main><SiteFooter/></div>;
  const results = games.filter((game) => game.categories.includes(category.slug));
  return <div className="min-h-screen"><SiteHeader/><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <nav className="text-xs text-muted-foreground"><Link to="/" className="hover:text-primary">Início</Link><span className="mx-2">/</span><Link to="/categorias" className="hover:text-primary">Categorias</Link><span className="mx-2">/</span>{category.name}</nav>
    <h1 className="mt-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">Jogos de {category.name}</h1>
    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{category.description} Explore {results.length} {results.length === 1 ? "jogo" : "jogos"} e encontre seu próximo favorito.</p>
    <div className="mt-6"><GameGrid games={results}/></div>
  </main><SiteFooter/></div>;
}
