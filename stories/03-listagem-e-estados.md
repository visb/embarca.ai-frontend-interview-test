# Plan: Listagem de pokémons com cards e estados de UI

## Context

Requisito 1 do README: exibir os 100 primeiros pokémons em cards com **nome, imagem, tipos e
número/ID**, com estados de **loading, erro e lista vazia**. É a primeira tela real e define o
vocabulário de UI que as stories seguintes reusam.

Decisões travadas:

- Página é **Server Component** consumindo `getPokemonCatalog()` de
  [02-camada-de-servicos-pokeapi](./02-camada-de-servicos-pokeapi.md). Sem `useEffect` de fetch.
- Loading via `app/loading.tsx` (streaming do App Router), erro via `app/error.tsx` (Client
  Component com `reset`) — convenções de arquivo do Next, não estado manual.
- Estado vazio é **componente próprio** desde já, mesmo que a lista completa nunca seja vazia:
  busca e filtro (stories 05/06) vão cair nele.
- Imagens com `next/image` (não `<img>`) — o README cobra "uso adequado de recursos do Next.js";
  `remotePatterns` já configurado na story 02.
- Tailwind 4 (já instalado) para estilo. Sem lib de UI nova.

Trade-off aceito: renderizar 100 cards de uma vez sem virtualização. Volume é pequeno e fixo;
virtualizar seria complexidade sem ganho medível — e a paginação da story 04 reduz para 20.

## Desenho

- `app/page.tsx` — Server Component async; chama o catálogo, renderiza `<PokemonGrid>`; `<h1>` e
  landmark `<main>` (o `layout.tsx` do scaffold precisa ser revisto).
- `app/loading.tsx` — grid de skeletons com a mesma altura do card (evita layout shift).
- `app/error.tsx` — `'use client'`, mensagem legível + botão "Tentar novamente" chamando `reset()`.
- `components/pokemon/PokemonCard.tsx` — imagem, `#0025` (ID zero-paddeado), nome capitalizado,
  badges de tipo. Server Component puro (sem `'use client'`).
- `components/pokemon/TypeBadge.tsx` — badge por tipo, cor derivada de um mapa
  `type -> classes tailwind`. Contraste de texto conferido na story 09.
- `components/pokemon/PokemonGrid.tsx` — grid responsivo (1 col mobile → 2 → 3 → 4/5 desktop);
  se `items.length === 0`, renderiza `<EmptyState>`.
- `components/ui/EmptyState.tsx` — título + descrição + `children` opcional (a story 06 injeta o
  botão "limpar filtros").
- `components/ui/Skeleton.tsx` — bloco de shimmer reusável.
- Ler `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md` e `.../12-images.md`
  antes de escrever `error.tsx` e o uso do `next/image`.

## Validação

Comandos:

- `pnpm lint`, `pnpm typecheck`, `pnpm build` — limpos.
- `pnpm test` — componentes (`PokemonCard`, `PokemonGrid`, `EmptyState`, `TypeBadge`) com RTL.
- `pnpm test:e2e` — fluxo da listagem.

Casos a cobrir:

- `PokemonCard`: mostra nome, `#0025`, alt textual não vazio na imagem, e um badge por tipo
  (pokémon de 1 tipo e de 2 tipos).
- `PokemonGrid`: com N itens renderiza N cards; com `[]` renderiza o `EmptyState` e **nenhum** card.
- `TypeBadge`: tipo desconhecido cai no estilo default sem quebrar.
- E2E (`e2e/listagem.spec.ts`): a home lista 100 cards; o primeiro card é o bulbasaur com imagem
  carregada; com a rota da PokeAPI interceptada em 500 (`page.route`), a UI de erro aparece com o
  botão de retry — e não uma tela branca.

Verificação manual (`pnpm dev`):

- `/` — grid responsivo em 375px, 768px e 1440px; sem scroll horizontal.
- Throttling de rede → o skeleton do `loading.tsx` aparece antes do conteúdo.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Paginação ([04](./04-paginacao.md)), busca ([05](./05-busca-por-nome.md)), filtro
  ([06](./06-filtro-por-tipo.md)) — aqui a lista é exibida inteira.
- Página de detalhes e navegação por clique no card (story 07 adiciona o `<Link>`).
- Auditoria de acessibilidade e contraste — story 09.
- Metadata/SEO — story 08.
