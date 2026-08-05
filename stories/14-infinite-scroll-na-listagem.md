# Plan: Infinite scroll na listagem, com estado de loading

## Context

Substitui a UI de paginação da [04-paginacao](./done/04-paginacao.md) por scroll infinito: a
listagem carrega de 20 em 20 conforme o usuário rola, com estado de loading visível na base da
grade. Continua atendendo o requisito 1 do README ("paginar a listagem de 20 em 20") — o tamanho
de fatia é o mesmo; o que muda é o gatilho (scroll em vez de clique) e o desaparecimento dos
controles.

Depende de: [04](./done/04-paginacao.md) (`paginate`, `parsePageParam`),
[05](./done/05-busca-por-nome.md) e [06](./done/06-filtro-por-tipo.md) (`applyFilters`,
`buildQuery`), [13](./13-estado-de-loading-nos-filtros.md) (`PendingIndicator`, padrão de
`useTransition`).

Decisões travadas:

- **`components/ui/Pagination.tsx` é removido.** Os controles numerados saem da tela; o
  `lib/pagination.ts` (`paginate`) **fica** — quem o usa passa a ser a Server Action.
- **`?page=N` continua na URL, com semântica nova: é o cursor de fatias carregadas, não a página
  atual.** `?page=4` significa "renderize as fatias 1..4" (80 cards), não "mostre a fatia 4". Sem
  isso, voltar de `/pokemon/[name]` jogaria o usuário para o topo — a dor clássica de infinite
  scroll. O param fica invisível para o usuário, mas mantém deep link e restauração de posição.
  Esta é a reconciliação de duas escolhas conflitantes no refino ("remover a paginação" + "restaurar
  via `?page`"): some a **UI** de paginação, permanece o **estado** na URL.
- **Próxima fatia vem de uma Server Action** que corta o catálogo já cacheado (`applyFilters` →
  `paginate`) e devolve só 20 itens + `hasMore`. Motivo: o payload inicial não embarca os 100 itens,
  o loading é real (existe round-trip) e o pipeline `filtrar → paginar` continua sendo um só, no
  servidor. **Nenhuma chamada nova à PokeAPI** (requisito 5).
- **O sentinel do `IntersectionObserver` envolve um `<button>` "Carregar mais" real e visível.**
  Auto-carregar por scroll não é alcançável por teclado nem previsível para leitor de tela; o botão
  é o alvo de foco e o fallback. O observer só antecipa o que o botão faria.
- **Mudar `q` ou `type` reseta a lista.** O `buildQuery` da story 05 já remove `page` quando os
  filtros mudam; o cliente usa `key` derivada de `q|type` para remontar a lista em vez de anexar
  resultados de conjuntos diferentes.
- **`useTransition` para o pending**, mesmo padrão da story 13 — spinner + skeletons de uma linha na
  base da grade, não substituindo os cards já carregados.
- **Falha da action não some com a lista:** mostra mensagem + botão "Tentar novamente" na base,
  preservando o que já foi carregado.
- Fim da lista tem estado explícito ("100 de 100") — sem isso o usuário rola esperando mais.

Trade-off aceito (risco real, decisão do usuário): **sem JS, a listagem passa a mostrar só a
primeira fatia.** Os `<Link>` de paginação eram o que fazia a navegação funcionar sem hidratação
(e o e2e da story 04 cobria isso). Depois desta story, o acesso ao restante do catálogo depende de
JS — o `?page=N` colado direto ainda renderiza no servidor, mas não há mais como _chegar_ nele sem
JS. Aceito em troca da UX de scroll contínuo.

## Desenho

- `app/actions.ts` — `'use server'`; `loadPokemonPage(page: number, filters: { q?: string; type?: string })`
  → `{ items, page, hasMore, total }`. Reusa `getPokemonCatalog()`, `applyFilters` e `paginate`;
  valida os params com os `parse*Param` existentes (nunca confiar no input do cliente).
  Ler `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` antes de escrever.
- `components/pokemon/InfiniteList.tsx` — `'use client'`. Recebe as fatias iniciais renderizadas no
  servidor (como `children`) + `{ initialPage, hasMore, filters }`. Estado: itens anexados, `page`,
  `hasMore`, `error`. `startTransition` na chamada da action; ao resolver, anexa e faz
  `router.replace(buildQuery(current, { page: novaPage }), { scroll: false })`.
- `components/pokemon/LoadMoreSentinel.tsx` — `IntersectionObserver` (`rootMargin` ~200px para
  pré-carregar antes de bater o fim) + `<button>` visível. Guard contra disparo duplo enquanto
  pendente. Observer desligado quando `hasMore === false`.
- `components/pokemon/ListStatus.tsx` — a base da grade: skeletons + `PendingIndicator` (story 13)
  enquanto carrega, erro com retry, ou "N de M pokémons" no fim. `aria-live="polite"` anunciando
  "mais 20 pokémons carregados".
- `app/page.tsx` — lê `?page=N`, chama `paginate` com `perPage: 20 * N` (ou fatia acumulada
  equivalente) para renderizar 1..N no servidor; passa a grade como children do `InfiniteList` e os
  metadados de cursor.
- `lib/pagination.ts` — acrescentar `paginateCumulative(items, page, perPage)` (fatias 1..N) ao lado
  do `paginate` existente; sem duplicar a regra de clamp.
- `components/ui/Pagination.tsx` — **deletado**; remover o uso em `app/page.tsx` e os testes/e2e
  dedicados (`e2e/paginacao.spec.ts` é reescrito, não apagado).
- `components/search/FilterBar.tsx` — o contador de resultados passa a mostrar
  "mostrando X de Y" em vez do total puro.

## Validação

Comandos:

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` — limpos.
- `pnpm test` — unit de `paginateCumulative` + `loadPokemonPage` + componentes `InfiniteList`,
  `LoadMoreSentinel`, `ListStatus`.
- `pnpm test:e2e` — fluxo de scroll, filtros e volta do detalhe.

Casos a cobrir:

- `paginateCumulative`: `page=1` → 20 itens; `page=4` → 80; `page=99` clampa em 100 com
  `hasMore: false`; lista vazia → `[]` e `hasMore: false`; conjunto filtrado de 23 → `page=2`
  devolve os 23 e encerra.
- `loadPokemonPage`: aplica `q` + `type` antes de fatiar (mesmo resultado do pipeline da story 06);
  `page` inválido/negativo não estoura; não dispara fetch novo na PokeAPI quando o catálogo está
  cacheado (spy no serviço).
- `InfiniteList`: anexa sem desmontar os cards existentes; não dispara duas chamadas concorrentes;
  ao mudar `q`/`type` a lista **reseta** (não mistura conjuntos); a URL vira `?page=2` via `replace`
  (histórico não cresce por fatia).
- `LoadMoreSentinel`: o `<button>` é alcançável por Tab e carrega ao `Enter`; o observer não dispara
  quando `hasMore === false`.
- `ListStatus`: erro da action mantém os cards já carregados e mostra retry; retry bem-sucedido
  anexa normalmente; no fim mostra o total e some o sentinel.
- E2E (`e2e/infinite-scroll.spec.ts`): rolar até o fim carrega +20 e a URL vira `?page=2`; repetir
  até 100 e o sentinel desaparecer com o texto de fim; com a action atrasada (`page.route`), os
  skeletons e o spinner aparecem na base; abrir `/?page=4` direto já renderiza 80 cards no HTML
  (sem JS na primeira pintura); clicar num card e voltar mantém a mesma quantidade de cards e a
  posição de scroll; filtrar com `?q=char` reseta para 20 e o scroll não anexa resultados do
  conjunto anterior.
- `e2e/paginacao.spec.ts` reescrito: some a asserção de controles de paginação; entra a asserção de
  que `?page=N` renderiza cumulativo.

Verificação manual (`pnpm dev`):

- Rolagem contínua sem "pulo" de scroll ao anexar (altura reservada pelos skeletons).
- Throttling Slow 3G: spinner/skeletons visíveis durante o carregamento, sem duplicar requisições ao
  rolar rápido para frente e para trás.
- Teclado: Tab alcança "Carregar mais"; o foco não é perdido depois de anexar.
- 375px: sentinel e status não geram scroll horizontal.
- Voltar do detalhe (`/pokemon/pikachu`) com 80 cards carregados devolve a lista no mesmo ponto.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Virtualização da lista (100 itens não justifica).
- Restauração de scroll pixel-perfect via `sessionStorage` — a restauração aqui vem da altura do
  DOM renderizado no servidor a partir de `?page=N`.
- Fallback sem JS para além da primeira fatia — abandonado conscientemente nesta story (ver Context).
- Prefetch de fatias futuras antes do sentinel entrar em viewport.
- Scroll infinito na página de detalhes ou em qualquer outra rota.
