/**
 * Dados mock centralizados do catálogo GameHub.
 *
 * IMPORTANTE: nenhum arquivo de jogo real é hospedado ou distribuído aqui.
 * As capas são artes demonstrativas geradas e os metadados são fictícios.
 * Para adicionar um jogo autorizado no futuro, basta acrescentar um item em
 * `games` com `playable: true` e a `embedUrl` licenciada — a UI já trata os
 * dois estados (jogável / apenas demonstrativo).
 */

import heroGranny from "@/assets/hero-granny.jpg";
import coverSubway from "@/assets/cover-subway.jpg";
import cover1v1 from "@/assets/cover-1v1.jpg";
import coverStumble from "@/assets/cover-stumble.jpg";
import coverBattle from "@/assets/cover-battle.jpg";
import coverVoxel from "@/assets/cover-voxel.jpg";
import coverBaby from "@/assets/cover-baby.jpg";
import coverPark from "@/assets/cover-park.jpg";
import coverIcecream from "@/assets/cover-icecream.jpg";
import coverMaze from "@/assets/cover-maze.jpg";
import coverCrew from "@/assets/cover-crew.jpg";
import coverSandbox from "@/assets/cover-sandbox.jpg";
import coverRhythm from "@/assets/cover-rhythm.jpg";
import coverFlappy from "@/assets/cover-flappy-pombo.jpg";

export type CategorySlug =
  | "acao"
  | "aventura"
  | "terror"
  | "corrida"
  | "multiplayer"
  | "puzzle"
  | "esportes";

export type Category = {
  slug: CategorySlug;
  name: string;
  icon: string;
  description: string;
};

export type Game = {
  id: string;
  slug: string;
  title: string;
  genre: string;
  categories: CategorySlug[];
  rating: number;
  plays: number;
  cover: string;
  hero?: string;
  shortDescription: string;
  description: string;
  developer: string;
  releaseYear: number;
  platforms: string[];
  tags: string[];
  /** true somente quando existir versão web autorizada. */
  playable: boolean;
  /** URL da build web licenciada (futuro). */
  embedUrl?: string;
  featured?: boolean;
  isNew?: boolean;
};

export const categories: Category[] = [
  { slug: "acao", name: "Ação", icon: "Swords", description: "Combate rápido e adrenalina constante." },
  { slug: "aventura", name: "Aventura", icon: "Compass", description: "Exploração, história e mundos abertos." },
  { slug: "terror", name: "Terror", icon: "Ghost", description: "Sustos, fuga e sobrevivência." },
  { slug: "corrida", name: "Corrida", icon: "Car", description: "Velocidade, curvas e recordes." },
  { slug: "multiplayer", name: "Multiplayer", icon: "Users", description: "Jogue com amigos e contra o mundo." },
  { slug: "puzzle", name: "Puzzle", icon: "Puzzle", description: "Lógica, enigmas e raciocínio." },
  { slug: "esportes", name: "Esportes", icon: "Trophy", description: "Partidas competitivas e placares." },
];

export const games: Game[] = [
  {
    id: "g-flappy-pombo",
    slug: "flappy-pombo",
    title: "Flappy Pombo",
    genre: "Arcade / Habilidade",
    categories: ["acao", "puzzle"],
    rating: 4.9,
    plays: 128_000,
    cover: coverFlappy,
    hero: coverFlappy,
    shortDescription:
      "Guie um pombo urbano entre canos de metal industriais. Jogue agora, direto no navegador.",
    description:
      "Jogo original do GameHub feito em HTML5: um pombo da cidade voa entre canos de metal enquanto você controla cada batida de asa. Física simples, dificuldade que cresce a cada ponto e recorde salvo no seu navegador. Funciona no computador e no celular, sem instalar nada.",
    developer: "GameHub Originals",
    releaseYear: 2026,
    platforms: ["Web", "Android", "iOS"],
    tags: ["Arcade", "Original", "Jogável"],
    playable: true,
    embedUrl: "/jogo/flappy-pombo",
    featured: true,
    isNew: true,
  },
  {
    id: "g-granny",
    slug: "granny",
    title: "Granny",
    genre: "Terror / Survival",
    categories: ["terror", "aventura"],
    rating: 4.8,
    plays: 18_420_000,
    cover: heroGranny,
    hero: heroGranny,
    shortDescription:
      "Você acordou trancado na casa dela. Cinco dias para escapar — e ela ouve absolutamente tudo.",
    description:
      "Survival horror em primeira pessoa dentro de uma casa labiríntica. Cada porta rangendo, cada objeto derrubado atrai a Granny. Encontre chaves, ferramentas e rotas de fuga enquanto administra o silêncio como recurso mais valioso do jogo.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2017,
    platforms: ["Android", "iOS", "PC"],
    tags: ["Sobrevivência", "Stealth", "Primeira pessoa"],
    playable: false,
    featured: true,
  },
  {
    id: "g-subway",
    slug: "subway-surfers",
    title: "Subway Surfers",
    genre: "Corrida infinita",
    categories: ["corrida", "acao"],
    rating: 4.7,
    plays: 24_900_000,
    cover: coverSubway,
    shortDescription: "Corrida infinita pelos trilhos com hoverboards, moedas e desvios milimétricos.",
    description:
      "Endless runner colorido: desvie de trens, colete moedas, ative hoverboards e bata seu recorde a cada tentativa. Controles simples de swipe, dificuldade que sobe rápido.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2012,
    platforms: ["Android", "iOS", "Web"],
    tags: ["Endless runner", "Casual", "Recordes"],
    playable: false,
    featured: true,
  },
  {
    id: "g-1v1",
    slug: "1v1-lol",
    title: "1v1.LOL",
    genre: "Shooter / Construção",
    categories: ["acao", "multiplayer"],
    rating: 4.5,
    plays: 12_300_000,
    cover: cover1v1,
    shortDescription: "Duelos rápidos de tiro e construção. Constrói, mira, elimina, repete.",
    description:
      "Arena shooter focado em duelos 1v1 com mecânica de construção de rampas e paredes. Treine mira, edição de estruturas e reflexo em partidas de poucos minutos.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2020,
    platforms: ["Web", "Android", "iOS"],
    tags: ["PvP", "Competitivo", "Build fight"],
    playable: false,
    featured: true,
  },
  {
    id: "g-stumble",
    slug: "stumble-guys",
    title: "Stumble Guys",
    genre: "Party / Battle royale",
    categories: ["multiplayer", "acao"],
    rating: 4.4,
    plays: 15_100_000,
    cover: coverStumble,
    shortDescription: "Até 32 jogadores tropeçando em pistas de obstáculos absurdas.",
    description:
      "Party royale caótico: corra, empurre, escorregue e sobreviva às eliminações rodada após rodada até a final. Física exagerada e partidas curtíssimas.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2020,
    platforms: ["Android", "iOS", "PC"],
    tags: ["Party game", "Battle royale", "Coop"],
    playable: false,
    featured: true,
  },
  {
    id: "g-freefire",
    slug: "free-fire",
    title: "Free Fire",
    genre: "Battle royale",
    categories: ["acao", "multiplayer"],
    rating: 4.6,
    plays: 21_700_000,
    cover: coverBattle,
    shortDescription: "50 jogadores, uma ilha, dez minutos. Só um esquadrão sai vivo.",
    description:
      "Battle royale mobile com partidas rápidas, personagens com habilidades ativas e ranqueadas por temporada. Loot, zona fechando e rotação de squad.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2017,
    platforms: ["Android", "iOS"],
    tags: ["Shooter", "Squad", "Ranqueada"],
    playable: false,
    featured: true,
  },
  {
    id: "g-minecraft-classic",
    slug: "minecraft-classic",
    title: "Minecraft Classic",
    genre: "Sandbox",
    categories: ["aventura", "puzzle"],
    rating: 4.9,
    plays: 9_800_000,
    cover: coverVoxel,
    shortDescription: "Blocos, criatividade e construção livre em um mundo voxel.",
    description:
      "Versão nostálgica em blocos: mundo gerado, paleta de materiais e construção livre. Ideal para criações rápidas sem gerenciamento de recursos.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2009,
    platforms: ["Web", "PC"],
    tags: ["Sandbox", "Criativo", "Voxel"],
    playable: false,
    featured: true,
  },
  {
    id: "g-baby-yellow",
    slug: "the-baby-in-yellow",
    title: "The Baby in Yellow",
    genre: "Terror",
    categories: ["terror", "puzzle"],
    rating: 4.3,
    plays: 4_200_000,
    cover: coverBaby,
    shortDescription: "Uma babá, um bebê estranho e uma noite que dá muito errado.",
    description:
      "Horror narrativo em capítulos: cuide do bebê, cumpra tarefas domésticas e descubra por que ele não é uma criança comum. Sustos de ritmo lento e humor sombrio.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2020,
    platforms: ["Android", "iOS", "PC"],
    tags: ["Narrativo", "Sustos", "Capítulos"],
    playable: false,
    isNew: true,
  },
  {
    id: "g-death-park-2",
    slug: "death-park-2",
    title: "Death Park 2",
    genre: "Terror / Puzzle",
    categories: ["terror", "puzzle"],
    rating: 4.2,
    plays: 2_600_000,
    cover: coverPark,
    shortDescription: "O parque abandonado reabriu — e o palhaço está esperando.",
    description:
      "Survival horror com enigmas ambientais em um parque de diversões decadente. Explore atrações, resolva puzzles e evite o perseguidor que aprende suas rotas.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2021,
    platforms: ["Android", "iOS", "PC"],
    tags: ["Puzzle horror", "Exploração"],
    playable: false,
    isNew: true,
  },
  {
    id: "g-ice-scream-8",
    slug: "ice-scream-8",
    title: "Ice Scream 8",
    genre: "Terror",
    categories: ["terror", "aventura"],
    rating: 4.4,
    plays: 3_400_000,
    cover: coverIcecream,
    shortDescription: "O sorveteiro voltou à vizinhança. Salve as crianças antes do amanhecer.",
    description:
      "Novo capítulo da série de terror stealth: resgates cronometrados, itens combináveis e um antagonista que patrulha o cenário em rotas dinâmicas.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2023,
    platforms: ["Android", "iOS"],
    tags: ["Stealth", "Resgate", "Série"],
    playable: false,
    isNew: true,
  },
  {
    id: "g-evil-nun-maze",
    slug: "evil-nun-maze",
    title: "Evil Nun Maze",
    genre: "Terror / Labirinto",
    categories: ["terror", "puzzle"],
    rating: 4.1,
    plays: 1_900_000,
    cover: coverMaze,
    shortDescription: "Corredores infinitos, velas apagando e algo que corre atrás de você.",
    description:
      "Fuga em labirinto procedural com níveis crescentes de tensão. Colete chaves, use distrações e memorize o mapa antes que ele mude.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2022,
    platforms: ["Android", "iOS"],
    tags: ["Labirinto", "Fuga", "Procedural"],
    playable: false,
    isNew: true,
  },
  {
    id: "g-among-us",
    slug: "among-us",
    title: "Among Us",
    genre: "Dedução social",
    categories: ["multiplayer", "puzzle"],
    rating: 4.6,
    plays: 8_100_000,
    cover: coverCrew,
    shortDescription: "Complete tarefas na nave — ou minta muito bem para vencer.",
    description:
      "Dedução social para grupos: tripulantes cumprem tarefas enquanto impostores sabotam e eliminam. Reuniões, votação e muita acusação.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2018,
    platforms: ["Web", "Android", "iOS", "PC"],
    tags: ["Social", "Coop", "Party"],
    playable: false,
    isNew: true,
  },
  {
    id: "g-roblox",
    slug: "roblox",
    title: "Roblox",
    genre: "Plataforma / Sandbox",
    categories: ["aventura", "multiplayer"],
    rating: 4.5,
    plays: 19_500_000,
    cover: coverSandbox,
    shortDescription: "Milhões de experiências criadas por jogadores em um só universo.",
    description:
      "Plataforma social de criação e jogo: obbys, simuladores, roleplay e mundos criados pela comunidade, com avatares personalizáveis.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2006,
    platforms: ["PC", "Android", "iOS", "Console"],
    tags: ["UGC", "Social", "Sandbox"],
    playable: false,
    isNew: true,
  },
  {
    id: "g-fnf",
    slug: "friday-night-funkin",
    title: "Friday Night Funkin'",
    genre: "Ritmo",
    categories: ["puzzle", "esportes"],
    rating: 4.7,
    plays: 11_200_000,
    cover: coverRhythm,
    shortDescription: "Batalhas de ritmo com setas na batida e trilha viciante.",
    description:
      "Jogo de ritmo indie: acerte as setas no tempo da música para vencer duelos musicais cada vez mais difíceis, com semanas temáticas e mods da comunidade.",
    developer: "Estúdio demonstrativo",
    releaseYear: 2020,
    platforms: ["Web", "PC"],
    tags: ["Ritmo", "Indie", "Música"],
    playable: false,
  },
];

/** Ranking "Mais Jogados" (ordem curada da home). */
export const mostPlayedSlugs = [
  "subway-surfers",
  "granny",
  "1v1-lol",
  "stumble-guys",
  "friday-night-funkin",
];

export const getGameBySlug = (slug: string) => games.find((g) => g.slug === slug);

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);

export const featuredGames = () => games.filter((g) => g.featured);

export const newGames = () => games.filter((g) => g.isNew);

export const mostPlayedGames = () =>
  mostPlayedSlugs.map((slug) => getGameBySlug(slug)).filter((g): g is Game => Boolean(g));

export const heroGame = () => getGameBySlug("granny")!;

export const gamesByCategory = (slug: CategorySlug) =>
  games.filter((g) => g.categories.includes(slug));

export const searchGames = (query: string, category?: string) => {
  const q = query.trim().toLowerCase();
  return games.filter((game) => {
    const matchesCategory =
      !category || category === "all" || game.categories.includes(category as CategorySlug);
    if (!matchesCategory) return false;
    if (!q) return true;
    return (
      game.title.toLowerCase().includes(q) ||
      game.genre.toLowerCase().includes(q) ||
      game.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
};

export const formatPlays = (plays: number) => {
  if (plays >= 1_000_000) return `${(plays / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (plays >= 1_000) return `${Math.round(plays / 1_000)}K`;
  return String(plays);
};
