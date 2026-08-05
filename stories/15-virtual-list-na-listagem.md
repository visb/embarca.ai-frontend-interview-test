# Plan: Virtual list na listagem

## Context

A grade da listagem passa a renderizar apenas as linhas visíveis (mais overscan), em vez dos N
cards já carregados. O gatilho de carregamento continua sendo o scroll infinito da
[14-infinite-scroll-na-listagem](./done/14-infinite-scroll-na-listagem.md) — o que muda é **o que
fica montado no DOM** depois que a fatia chega.

Depende de: [14](./done/14-infinite-scroll-na-listagem.md) (`InfiniteList`, `LoadMoreSentinel`,
`ListStatus`, `paginateCumulative`, cursor `?page=N`), [03](./done/03-listagem-e-estados.md)
(`PokemonGrid`, `PokemonCard`), [01-infra-de-testes](./01-infra-de-testes.md) (vitest + playwright
— **pré-requisito**, a story ainda não está em `done/`).

### O ganho de performance aqui é teórico — e a story assume isso

`CATALOG_SIZE = 100` e a grade vai até 4 colunas: são ~25 linhas no DOM no pior caso. Virtualizar
esse volume não move nenhuma métrica real. A story 14 registrou exatamente isso ao mandar
virtualização para **Fora de escopo** ("100 itens não justifica"), e essa avaliação continua
correta.

**Decisão do usuário: entregar mesmo assim, como demonstração de técnica.** A story é sobre a
arquitetura da virtualização (medição de linha, colunas responsivas, handoff com SSR, semântica
de lista acessível sob DOM parcial), não sobre ganhar milissegundos. Nenhum critério de aceite
desta story é uma meta de performance — não há "melhorar o INP em X". O que se prova é
**comportamento**: o DOM para de crescer com a lista.

Consequência aceita: a story **adiciona complexidade sem retorno de perf no volume atual**. Quem
ler o código depois precisa achar essa justificativa aqui, não deduzir que havia um problema de
performance. O `README.md` ganha isso explícito na seção de decisões técnicas.

### Decisões travadas

- **`@tanstack/react-virtual` (dependência nova), não hand-rolled.** Window scroller, medição
  dinâmica de elemento e cálculo de range já resolvidos. Escrever na mão significaria assumir
  `ResizeObserver`, medição de altura variável e os casos de borda de scroll — muito código
  próprio para uma story cujo ganho já é declaradamente teórico. Conferir no `pnpm add` que o peer
  de React cobre 19 (v3.13+); se não cobrir, a story para e vira decisão nova.
- **Scroll da janela, não container com altura fixa.** `useWindowVirtualizer`. O
  `LoadMoreSentinel`, o `IntersectionObserver` e a restauração de posição ao voltar do detalhe
  (story 14) continuam valendo sem reescrita, e o layout da página não muda.
- **Virtualiza por linha, não por card.** A unidade do virtualizer é a linha da grade
  (`ceil(items / colunas)`), com os cards de cada linha renderizados juntos.
- **As colunas passam a ser calculadas em JS, e o JS vira a fonte da verdade.** O virtualizer
  precisa saber quantos itens cabem por linha; as classes `sm:grid-cols-2 lg:grid-cols-3
xl:grid-cols-4` são invisíveis para ele. Manter os dois lados seria duas verdades divergindo no
  primeiro ajuste de breakpoint. Então a grade virtual usa `gridTemplateColumns` inline vindo de
  `columnsForWidth(width)`, e os breakpoints (640/1024/1280) ficam num único lugar com comentário
  amarrando-os ao Tailwind.
- **Altura de linha é medida, não estimada.** O card tem imagem `aspect-square` — a altura muda
  com a largura da coluna. `estimateSize` só serve para a primeira pintura; a altura real vem de
  `measureElement`. Sem isso, a barra de scroll mente e o "voltar do detalhe" cai no lugar errado.
- **SSR renderiza a primeira fatia normalmente; a virtualização só assume depois de hidratar.**
  O servidor continua mandando os cards de `?page=N` como HTML (`PokemonGrid`, CSS grid, markup de
  hoje). O `VirtualGrid` renderiza exatamente isso enquanto `mounted === false` — o primeiro render
  do cliente bate com o do servidor, sem mismatch — e troca para o modo virtual num `useEffect`.
  Preserva o que a [08-seo-e-metadata](./done/08-seo-e-metadata.md) entregou e mantém a listagem
  legível sem JS na primeira fatia.
- **Semântica de lista muda de `<ul>/<li>` para `role="list"`/`role="listitem"`.** Com linhas
  posicionadas em absoluto, um `<li>` por linha diria ao leitor de tela "25 itens" quando são 100,
  e aninhar listas seria pior. Cada card carrega `aria-setsize={total}` e `aria-posinset={i + 1}`,
  para o leitor de tela anunciar a posição real mesmo com o DOM parcial. Isso vale só para o modo
  virtual; o `PokemonGrid` pré-hidratação mantém `<ul>/<li>`.
- **`overscan` de 3 linhas.** Cobre o Tab para o card logo abaixo da dobra e reduz o branco em
  rolagem rápida.

Trade-offs aceitos:

- **Ctrl+F do navegador deixa de achar cards fora da viewport.** É a perda clássica de qualquer
  virtualização e não tem mitigação boa aqui — a busca por nome da aplicação (`?q=`) é o caminho
  suportado.
- **Crawler que executa JS vê menos cards do que o HTML inicial trazia.** O HTML da primeira fatia
  segue completo, mas depois da hidratação o DOM fica parcial.
- **`print` da página sai truncado.** Só o que estiver montado imprime.

## Desenho

- `package.json` — `@tanstack/react-virtual` em `dependencies`.
- `lib/grid.ts` (novo, puro) — `GRID_BREAKPOINTS` e
  `columnsForWidth(width: number): 1 | 2 | 3 | 4`. Comentário amarrando os valores aos breakpoints
  do Tailwind usados no `PokemonGrid`. Sem DOM, sem React — é o pedaço testável em unidade.
- `components/pokemon/useGridColumns.ts` (novo) — `'use client'`. `ResizeObserver` no container +
  `columnsForWidth`. Devolve `{ ref, columns }`. Estado inicial coerente com o que o servidor
  renderizou (evita recalcular antes da primeira medição).
- `components/pokemon/VirtualGrid.tsx` (novo) — `'use client'`. Recebe a mesma prop shape do
  `PokemonGrid` (`items`, `listingQuery`, `emptyTitle`, `emptyDescription`, `emptyAction`).
  - `items.length === 0` → delega ao `EmptyState` como hoje (nada a virtualizar).
  - `mounted === false` → renderiza `<PokemonGrid {...props} />` puro.
  - `mounted === true` → `useWindowVirtualizer({ count: rowCount, estimateSize, overscan: 3,
scrollMargin })`, container com `height: totalSize`, linhas absolutas com
    `transform: translateY(...)`, `ref={virtualizer.measureElement}` em cada linha.
  - `scrollMargin` a partir do offset do container: sem isso o virtualizer trata o topo da janela
    como o topo da lista e erra o range (a grade fica abaixo do `h1` e da `FilterBar`).
  - Cards recebem `aria-setsize` / `aria-posinset`.
- `components/pokemon/InfiniteList.tsx` — troca `<PokemonGrid>` por `<VirtualGrid>`. Nada mais
  muda: `loadMore`, cursor na URL, `listingQuery` e o sentinel ficam como estão.
- `components/pokemon/PokemonGrid.tsx` — **permanece**, agora com dois papéis: markup
  pré-hidratação e fallback. Sem mudança de API.
- `components/pokemon/PokemonCard.tsx` — aceita `setSize`/`posInSet` opcionais, repassados para o
  `<article>` como `role="listitem"` + `aria-setsize`/`aria-posinset` quando presentes. Ausentes,
  o card renderiza como hoje.
- `README.md` — nova entrada em "Decisões técnicas" registrando a virtualização **e** o fato de o
  ganho ser teórico neste volume; remover "sem scroll infinito" das limitações (já falso desde a 14) e acrescentar as perdas de Ctrl+F/print.

Nada em `app/` muda: `page.tsx`, a Server Action e o pipeline `applyFilters → paginateCumulative`
ficam intactos. **Nenhuma chamada nova à PokeAPI.**

## Validação

Comandos:

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:check`, `pnpm build` — limpos.
- `pnpm test` — unit de `columnsForWidth`, `useGridColumns`, `VirtualGrid`, `PokemonCard`.
- `pnpm test:e2e` — é aqui que a virtualização de verdade é provada (jsdom não tem layout: toda
  altura medida é 0, então o range do virtualizer não é confiável em unit).

Casos a cobrir:

- `columnsForWidth`: `320 → 1`, `639 → 1`, `640 → 2`, `1023 → 2`, `1024 → 3`, `1279 → 3`,
  `1280 → 4`, `0 → 1` (nunca devolve 0 — divisão por zero no `rowCount`).
- `useGridColumns`: reage ao `ResizeObserver` (stub) mudando a largura; não dispara update quando
  a largura muda sem cruzar breakpoint.
- `VirtualGrid`: com `items: []` renderiza o `EmptyState` e nenhum container virtual; no primeiro
  render (pré-`useEffect`) o markup é o do `PokemonGrid` — a asserção que protege contra hydration
  mismatch; depois de montar, o container existe com `role="list"` e os cards renderizados têm
  `aria-setsize` igual ao total e `aria-posinset` sequencial.
- `PokemonCard`: sem `setSize`/`posInSet` o markup é idêntico ao de hoje (sem `role`/`aria-*`
  novos); com eles, os atributos aparecem e o `aria-label` do link não muda.
- `InfiniteList`: anexar uma fatia continua funcionando com o `VirtualGrid` no lugar — itens
  acumulam, a URL vira `?page=N` via `replaceState`, e trocar `q`/`type` reseta a lista (as
  garantias da story 14 não podem regredir).
- E2E (`e2e/virtual-list.spec.ts`):
  - **DOM parcial:** carregar as 100 fatias (clicar "Carregar mais" até o fim) e afirmar que os
    cards montados são **menos** que 100 — este é o caso que prova a story. Contar
    `[role="listitem"]`.
  - **DOM constante:** o número de cards montados no topo da lista e depois de rolar até o meio
    fica na mesma ordem de grandeza (não cresce com o scroll).
  - **Nada some da lista lógica:** rolar do topo ao fim e coletar os nomes vistos devolve os 100,
    sem buraco e sem repetição.
  - **SSR intacto:** `/?page=2` com JS desligado (`context({ javaScriptEnabled: false })`) traz 40
    cards no HTML, em `<ul>/<li>`.
  - **Sem salto na hidratação:** com JS ligado, `scrollY` continua 0 e nenhum card visível troca de
    posição depois que o virtualizer assume.
  - **Voltar do detalhe:** com ~80 cards carregados, abrir um card e voltar devolve a mesma
    quantidade e a mesma posição de scroll (regressão direta da story 14 sob DOM virtual).
  - **Resize:** 375px → 1280px recalcula as colunas (1 → 4) sem duplicar nem perder cards.
  - **Sentinel e teclado:** o botão "Carregar mais" continua alcançável por Tab e o foco não se
    perde ao anexar (o botão vive fora da janela virtual).

Verificação manual (`pnpm dev`):

- Rolar do topo ao fim com o DevTools aberto: a contagem de nós do container não cresce.
- Rolagem rápida (fling) não deixa faixa branca perceptível com `overscan: 3`.
- 375px, 768px, 1440px: sem scroll horizontal, sem sobreposição de linhas, gap igual ao da grade
  atual.
- Throttling Slow 3G: skeletons da story 14 continuam reservando a altura da fatia; sem "pulo" ao
  anexar.
- `prefers-reduced-motion`: nenhuma animação nova introduzida pelo posicionamento das linhas.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm run lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- **Aumentar o `CATALOG_SIZE`.** Continua 100. Se o catálogo crescer, é story própria — mexe em
  `generateStaticParams`, tempo de build e payload.
- Provar escala com catálogo mockado de milhares de itens — a story entrega a técnica no volume
  atual, não um benchmark.
- Virtualizar qualquer outra coisa (opções do filtro de tipo, conteúdo da página de detalhes).
- Trocar o scroll da janela por container com altura fixa.
- `content-visibility: auto` como alternativa CSS-only — descartado por não resolver o custo de
  montagem no React, que é o alvo da técnica aqui.
- Restauração de scroll pixel-perfect via `sessionStorage`: continua vindo do DOM renderizado a
  partir de `?page=N`, como na story 14.
- Recuperar Ctrl+F e impressão completa da lista (perdas assumidas no Context).
- Metas numéricas de performance (INP/LCP) — a story é sobre comportamento do DOM, não sobre
  métrica.
