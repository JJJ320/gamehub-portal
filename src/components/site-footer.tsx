import { Link } from "@tanstack/react-router";
import { Gamepad2, Trophy } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/70 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2" aria-label="GameHub - Início">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-violet shadow-glow">
              <Gamepad2 className="size-4 text-primary-foreground" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">
              GAME<span className="text-gradient-violet">HUB</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Seu portal para descobrir, jogar e acompanhar os jogos do GameHub.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Navegar</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/jogos" search={{ q: undefined, cat: undefined }} className="text-foreground/80 transition-colors hover:text-primary">Todos os Jogos</Link></li>
            <li><Link to="/categorias" className="text-foreground/80 transition-colors hover:text-primary">Categorias</Link></li>
            <li><Link to="/mais-jogados" className="text-foreground/80 transition-colors hover:text-primary">Mais Jogados</Link></li>
            <li><Link to="/novos" className="text-foreground/80 transition-colors hover:text-primary">Novos Jogos</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Comunidade</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/ranking" className="inline-flex items-center gap-2 text-foreground/80 transition-colors hover:text-primary"><Trophy className="size-4" /> Ranking</Link></li>
            <li><Link to="/perfil" className="text-foreground/80 transition-colors hover:text-primary">Meu perfil</Link></li>
            <li><Link to="/auth" search={{}} className="text-foreground/80 transition-colors hover:text-primary">Entrar / criar conta</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GameHub. Marcas e jogos pertencem a seus respectivos titulares.
      </div>
    </footer>
  );
}
