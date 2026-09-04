import { lazy, type ComponentType } from "react";

/**
 * Registro central de jogos HTML5 próprios do GameHub.
 * Para adicionar um novo jogo jogável:
 *  1. crie o componente em `src/games/<slug>/`
 *  2. registre o slug aqui
 *  3. marque `playable: true` e `embedUrl: "/jogo/<slug>"` em `src/data/games.ts`
 */
export const playableGames: Record<string, ComponentType> = {
  "flappy-pombo": lazy(() => import("./flappy-pombo/flappy-pombo")),
};

export const getPlayableGame = (slug: string): ComponentType | undefined =>
  playableGames[slug];
