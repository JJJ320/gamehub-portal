import { Link } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/70 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-violet">
              <Gamepad2 className="size-4 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-extrabold">
              GAME<span className="text-gradient-violet">HUB</span>
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Portal que reúne o melhor do catálogo gamer. Esta é uma primeira versão com dados e
            artes demonstrativos — nenhum arquivo de jogo protegido é hospedado ou distribuído.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Navegar
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/jogos" className="text-foreground/80 hover:text-primary">Todos os Jogos</Link></li>
            <li><Link to="/categorias" className="text-foreground/80 hover:text-primary">Categorias</Link></li>
            <li><Link to="/mais-jogados" className="text-foreground/80 hover:text-primary">Mais Jogados</Link></li>
            <li><Link to="/novos" className="text-foreground/80 hover:text-primary">Novos Jogos</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Em breve
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Contas e perfis de jogador</li>
            <li>Favoritos e avaliações</li>
            <li>Ranking global em tempo real</li>
            <li>Execução de versões web autorizadas</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GameHub — projeto demonstrativo. Marcas e jogos citados
        pertencem a seus respectivos titulares.
      </div>
    </footer>
  );
}
