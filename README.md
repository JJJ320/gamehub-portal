# 🎮 GameHub Portal

<p align="center">
  <strong>Um portal de jogos web modular, moderno e expansível.</strong>
</p>

<p align="center">
  <a href="#-recursos">Recursos</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-arquitetura">Arquitetura</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-desenvolvimento">Desenvolvimento</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/Cloudinary-Media-3448C5?logo=cloudinary&logoColor=white" alt="Cloudinary">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
</p>

---

## 📖 Sobre o projeto

O **GameHub Portal** é uma plataforma de jogos para navegador construída com uma arquitetura modular.

A ideia central do projeto é permitir que novos jogos sejam adicionados ao catálogo sem precisar criar manualmente uma nova estrutura de página para cada jogo.

O portal combina:

* autenticação de usuários;
* catálogo dinâmico;
* gerenciamento de jogos;
* armazenamento de mídia;
* favoritos;
* histórico;
* avaliações;
* contador de tempo de jogo;
* sistema de permissões para Owners;
* suporte a jogos HTML;
* infraestrutura serverless.

---

## ✨ Recursos

### 👤 Usuários

* 🔐 Login com Google
* 🖼️ Perfil personalizado
* 📷 Foto de perfil
* ⭐ Favoritos
* 🎮 Histórico de jogos
* ⭐ Avaliação dos jogos
* ⏱️ Rastreamento preciso do tempo de jogo

### 🎮 Jogos

* Catálogo modular
* Página individual para cada jogo
* Jogos HTML
* Jogos internos do próprio projeto
* Jogos hospedados externamente
* Capas e banners personalizados
* Categorias
* Tags
* Jogos novos
* Jogos em destaque
* Registro de partidas

### 👑 Administração

Owners podem:

* criar jogos;
* editar jogos;
* excluir jogos;
* publicar jogos;
* enviar capas;
* enviar banners;
* enviar arquivos HTML;
* configurar categorias;
* configurar tags;
* definir informações do jogo.

### ☁️ Infraestrutura

* Firebase Authentication
* Cloud Firestore
* Cloudinary
* Cloudflare Workers
* GitHub
* GitHub Desktop

---

# 🛠️ Tecnologias

| Tecnologia                  | Utilização                |
| --------------------------- | ------------------------- |
| **React**                   | Interface                 |
| **TypeScript**              | Tipagem e desenvolvimento |
| **Vite**                    | Build e desenvolvimento   |
| **TanStack Router**         | Roteamento                |
| **Tailwind CSS**            | Estilização               |
| **Lucide React**            | Ícones                    |
| **Firebase Authentication** | Autenticação              |
| **Cloud Firestore**         | Banco de dados            |
| **Cloudinary**              | Imagens e arquivos        |
| **Cloudflare Workers**      | Deploy                    |
| **GitHub**                  | Versionamento             |

---

# 🏗️ Arquitetura

O GameHub separa a aplicação em diferentes responsabilidades.

```text
                         ┌──────────────────┐
                         │    GameHub UI     │
                         │      React        │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
             ┌──────▼──────┐             ┌──────▼──────┐
             │   Firebase  │             │  Cloudinary │
             │             │             │             │
             │ Auth        │             │ Imagens     │
             │ Firestore   │             │ Jogos HTML  │
             └──────┬──────┘             └─────────────┘
                    │
             ┌──────▼──────┐
             │   GameHub   │
             │    Data     │
             └─────────────┘

                    │
             ┌──────▼──────┐
             │  Cloudflare │
             │   Workers   │
             └─────────────┘
```

---

# 📦 Sistema modular de jogos

Cada jogo possui uma estrutura de dados independente.

Exemplo conceitual:

```ts
type Game = {
  id: string;
  slug: string;
  title: string;

  genre: string;
  categories: string[];

  rating: number;
  plays: number;

  cover: string;
  hero: string;

  shortDescription: string;
  description: string;

  developer: string;
  releaseYear: number;

  platforms: string[];
  tags: string[];

  playable: boolean;

  gameType?: "internal" | "url" | "html";
  gameUrl?: string;

  featured?: boolean;
  isNew?: boolean;
};
```

Isso permite que o mesmo sistema renderize diferentes tipos de jogos.

---

# ⏱️ Rastreamento de tempo

O tempo de jogo é armazenado com precisão de **milissegundos**.

```text
playTimeMs
```

Exemplo:

```text
12438
```

Representa:

```text
12,438 ms
```

Na interface:

```text
0:12.438
```

Para períodos maiores:

```text
1:23:45.672
```

O sistema:

* atualiza o contador durante a partida;
* atualiza a interface em alta frequência;
* sincroniza o tempo periodicamente;
* salva o restante ao sair da partida;
* mantém compatibilidade com dados antigos armazenados em segundos.

---

# 🔥 Firebase

## Authentication

O Firebase Authentication é utilizado para identificar os usuários.

Atualmente o método principal de autenticação é:

```text
Google
```

---

## Firestore

Principais coleções:

```text
profiles/
games/
favorites/
userGames/
owners/
```

### Dados individuais

Os dados de cada usuário ficam isolados pelo UID:

```text
userGames/
└── USER_ID/
    └── games/
        └── GAME_SLUG/
```

Exemplo:

```json
{
  "gameSlug": "flappy-pombo",
  "favorite": true,
  "playTimeMs": 12438,
  "rating": 5
}
```

---

# 👑 Sistema de Owner

O gerenciamento do catálogo utiliza a coleção:

```text
owners/
```

O ID do documento deve ser o **UID do usuário autenticado**.

Exemplo:

```text
owners/
└── abc123...
    └── role: "owner"
```

As regras do Firestore verificam a existência desse documento antes de permitir operações administrativas no catálogo.

A coleção `owners` é protegida contra escrita pelo cliente.

---

# ☁️ Cloudinary

O Cloudinary é responsável pelo armazenamento de mídia.

Tipos utilizados:

```text
cover → image
hero  → image
game  → raw
```

Os arquivos dos jogos são organizados por slug:

```text
gamehub/games/<slug>/
```

### Variáveis de ambiente

```env
VITE_CLOUDINARY_CLOUD_NAME=dlmrbca0i
VITE_CLOUDINARY_UPLOAD_PRESET=gamehub_upload
```

> Nunca coloque credenciais privadas ou secrets no repositório.

---

# 🎮 Primeiro jogo

O primeiro jogo integrado ao GameHub é:

## Flappy Pombo 🐦

Ele serve como implementação inicial do sistema de jogos internos e como referência para futuras integrações.

A arquitetura permite adicionar novos títulos sem precisar modificar a estrutura principal do portal.

---

# 📁 Estrutura do projeto

```text
gamehub-portal/
│
├── public/
│
├── src/
│   ├── components/
│   ├── data/
│   ├── games/
│   │   └── flappy-pombo/
│   ├── hooks/
│   ├── lib/
│   └── routes/
│
├── firestore.rules
├── firebase.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 🚀 Instalação

## Pré-requisitos

* Node.js
* npm
* Git

Clone o repositório:

```bash
git clone https://github.com/JJJ320/gamehub-portal.git
```

Entre no diretório:

```bash
cd gamehub-portal
```

Instale as dependências:

```bash
npm install
```

---

# 💻 Desenvolvimento

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Por padrão, o Vite disponibilizará a aplicação localmente.

---

# 🏭 Build

Para gerar uma versão de produção:

```bash
npm run build
```

Antes de enviar alterações para produção, recomenda-se sempre executar o build e verificar se não existem erros.

---

# 🌐 Deploy

O projeto utiliza **Cloudflare Workers** para produção.

O fluxo recomendado é:

```text
Alteração local
      │
      ▼
npm run build
      │
      ▼
Git commit
      │
      ▼
GitHub
      │
      ▼
Cloudflare
      │
      ▼
Produção
```

---

# 🔐 Segurança

O GameHub utiliza regras do Firestore para limitar o acesso aos dados.

### Princípios utilizados

* usuários só podem modificar seus próprios dados;
* dados de jogos administrativos exigem autenticação;
* operações administrativas exigem registro em `owners`;
* clientes não podem conceder a si mesmos permissão de Owner;
* arquivos privados e secrets não devem ser enviados ao GitHub.

---

# 🧪 Testes manuais

Antes de uma publicação, recomenda-se verificar:

### Autenticação

* [ ] Login com Google
* [ ] Logout
* [ ] Reentrada na conta

### Perfil

* [ ] Alteração do nome
* [ ] Alteração da foto
* [ ] Persistência das alterações

### Jogos

* [ ] Abrir um jogo
* [ ] Iniciar partida
* [ ] Contador de tempo
* [ ] Persistência do tempo
* [ ] Histórico
* [ ] Favoritos
* [ ] Avaliação

### Administração

* [ ] Acesso de Owner
* [ ] Criar jogo
* [ ] Editar jogo
* [ ] Excluir jogo
* [ ] Upload de capa
* [ ] Upload de banner
* [ ] Upload de jogo HTML
* [ ] Publicação

### Produção

* [ ] `npm run build`
* [ ] Deploy Cloudflare
* [ ] Login em produção
* [ ] Teste de jogo em produção

---

# 🗺️ Roadmap

O projeto está sendo desenvolvido de forma incremental.

### 🟢 Base

* [x] Autenticação Google
* [x] Perfis
* [x] Favoritos
* [x] Histórico
* [x] Avaliações
* [x] Tempo de jogo
* [x] Firestore
* [x] Sistema de Owner
* [x] Catálogo modular
* [x] Upload de mídia
* [x] Flappy Pombo

### 🟡 Próximas funcionalidades

* [ ] Sistema de conquistas
* [ ] Rankings
* [ ] Estatísticas detalhadas
* [ ] Pesquisa de jogos
* [ ] Melhorias no painel administrativo
* [ ] Mais jogos próprios
* [ ] Sistema de publicação avançado

### 🔵 Futuro

* [ ] Sistema de anúncios
* [ ] Recompensas por anúncios
* [ ] Sistema de vidas/revives
* [ ] Perfil avançado de jogador
* [ ] Conquistas globais
* [ ] Eventos e desafios
* [ ] Mais recursos sociais

---

# 🤝 Contribuição

Contribuições são bem-vindas.

Fluxo sugerido:

```bash
git clone https://github.com/JJJ320/gamehub-portal.git
cd gamehub-portal
npm install
npm run dev
```

Para alterações maiores:

1. Crie uma branch.
2. Faça as alterações.
3. Execute `npm run build`.
4. Teste a funcionalidade.
5. Faça um commit descritivo.
6. Abra um Pull Request.

---

# 📜 Licença

Este projeto possui código e conteúdos que podem ter condições específicas de uso.

Antes de redistribuir o projeto, jogos, imagens ou outros recursos, verifique as respectivas condições de licença e propriedade.

---

# 🎮 GameHub Portal

<p align="center">
  <strong>Jogue. Descubra. Divirta-se.</strong>
</p>

<p align="center">
  Construído com ❤️ para a web.
</p>
