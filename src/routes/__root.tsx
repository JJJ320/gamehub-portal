import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import appCss from "@/styles.css?url";

function NotFoundComponent() {
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold">404</h1><h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2><p className="mt-2 text-sm text-muted-foreground">Essa página não existe ou foi movida.</p><Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Voltar ao início</Link></div></div>;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { console.error("Erro da aplicação:", error); }, [error]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold">Não foi possível carregar esta página</h1><p className="mt-2 text-sm text-muted-foreground">Tente atualizar ou voltar ao início.</p><div className="mt-6 flex justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Tentar novamente</button><a href="/" className="rounded-md border border-input px-4 py-2 text-sm">Início</a></div></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GameHub — Portal de Jogos Online" },
      { name: "description", content: "GameHub — catálogo e jogos online." },
      { name: "author", content: "GameHub" },
      { property: "og:title", content: "GameHub — Portal de Jogos Online" },
      { property: "og:description", content: "Catálogo de jogos do GameHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Inter+Tight:wght@400;500;600;700;800&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><AuthProvider><Outlet /></AuthProvider></QueryClientProvider>;
}
