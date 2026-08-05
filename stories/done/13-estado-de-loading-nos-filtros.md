# Plan: Estado de loading na busca e no filtro por tipo

## Context

Requisito 5 do README (performance/UX): a tela precisa responder ao usuário enquanto o resultado
não chegou. Hoje, pelas stories [05](./done/05-busca-por-nome.md) e
[06](./done/06-filtro-por-tipo.md),
digitar ou trocar o tipo dispara `router.replace()` e a UI fica **muda** — o debounce de ~300ms
mais o round-trip do Server Component passam sem nenhum sinal, e a grade continua mostrando o
resultado antigo como se fosse o novo.

Depende de: story 05 (`SearchInput`, `buildQuery`) e story 06 (`TypeFilter`, `FilterBar`). Esta
story **altera** esses componentes, não cria a feature de busca/filtro.

Decisões travadas:

- **`useLinkStatus` não serve aqui.** Ele só funciona dentro de um `<Link>`
  (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`), e
  busca/filtro navegam via `useRouter().replace()`. O mecanismo é `useTransition` +
  `startTransition(() => router.replace(...))` → `isPending`.
- **Feedback em dois níveis:** spinner inline dentro do input e ao lado do `<select>` (quem mexeu
  vê que o controle registrou), **e** a grade esmaecida (`opacity` reduzida + `aria-busy="true"`)
  enquanto pendente — sinaliza que o conteúdo exibido está desatualizado. Não trocar os cards por
  skeleton: piscaria a tela inteira a cada tecla e quebraria a "digitação fluida" travada na
  story 05.
- **O loading começa na primeira tecla**, não quando o `replace` dispara. Cobrir a janela do
  debounce é o ponto principal — é justamente nela que a UI hoje parece travada. Isso exige um
  estado próprio (`isTyping`) além do `isPending` do `useTransition`; o indicador é
  `isTyping || isPending`, e `isTyping` é desligado no mesmo lugar em que o debounce dispara a
  navegação.
- **Sem layout shift.** O slot do spinner é sempre renderizado com tamanho fixo, alternando só
  opacidade/visibilidade — mesma orientação da doc do `useLinkStatus` ("prefer a fixed-size,
  always-rendered hint element").
- **Delay de ~100ms antes de aparecer.** Com o catálogo cacheado a navegação costuma ser
  instantânea; mostrar o spinner de imediato vira flash. Animação com `animation-delay: 100ms`
  partindo de `opacity: 0` (padrão da doc, seção "Gracefully handling fast navigation").
- O `<select>` e o `<input>` **não** são desabilitados durante o pending: bloquear digitação ou
  troca de tipo no meio da transição é pior que exibir resultado defasado por 200ms, e tiraria o
  foco do teclado.

Trade-off aceito: dois pedaços de estado (`isTyping` + `isPending`) em vez de um. A alternativa
(só `isPending`) é mais simples, mas deixa exatamente os 300ms do debounce sem sinal — que é o
problema que esta story existe para resolver.

## Desenho

- `components/search/useFilterTransition.ts` (ou `hooks/`, seguindo o que existir no repo) — hook
  cliente que centraliza o padrão: expõe `{ pending, navigate }`, onde `navigate(href)` liga o
  estado imediato e chama `startTransition(() => router.replace(href, { scroll: false }))`.
  `SearchInput` e `TypeFilter` passam a usar o mesmo hook — um só caminho de navegação de filtro,
  sem duas implementações divergentes.
- `components/search/SearchInput.tsx` — passa a marcar `isTyping` no `onChange` (antes do
  debounce), a navegar via `navigate()` do hook e a renderizar `<PendingIndicator>` no canto do
  campo. `aria-busy` no wrapper do controle.
- `components/search/TypeFilter.tsx` — mesmo hook no `onChange` do `<select>` +
  `<PendingIndicator>` ao lado.
- `components/ui/PendingIndicator.tsx` — spinner de tamanho fixo, `aria-hidden`, sempre
  renderizado, classe `is-pending` alternando a animação com delay de 100ms.
- `components/search/FilterBar.tsx` — vira o dono do estado compartilhado de pending (busca e tipo
  alimentam o mesmo sinal), e propaga para a área de resultados.
- `app/page.tsx` / `components/pokemon/PokemonGrid.tsx` — a grade recebe o pending e aplica
  `aria-busy` + esmaecimento. Como a página é Server Component, o estado vive no client:
  encapsular a grade num wrapper cliente fino (`ResultsArea`) que só lê o contexto de pending e
  aplica a classe, mantendo os cards como Server Components (nada de `'use client'` no
  `PokemonCard`).
- Anúncio para leitor de tela: região `aria-live="polite"` com o contador de resultados da story 06
  ("23 pokémons encontrados") — durante o pending o contador não é reanunciado; ao terminar, sim.
- Ler antes de codar: `.../04-functions/use-link-status.md` (por que não se aplica + padrão de
  animação) e `.../01-getting-started/04-linking-and-navigating.md` (seção "Slow networks").

## Validação

Comandos:

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` — limpos.
- `pnpm test` — unit/componente do hook, `PendingIndicator`, `SearchInput`, `TypeFilter`.
- `pnpm test:e2e` — feedback visível durante navegação lenta.

Casos a cobrir:

- `useFilterTransition`: `navigate()` liga o pending **antes** de chamar `router.replace`;
  o pending cai quando a transição resolve; chamadas em sequência rápida não deixam o pending
  preso ligado (última vence).
- `SearchInput` (RTL + `user-event` + timers fake): digitar liga o indicador **imediatamente**,
  antes de o debounce expirar; o indicador continua ligado durante a navegação; some depois;
  o input segue habilitado e com foco durante todo o pending.
- `TypeFilter`: trocar o tipo liga o indicador; `<select>` não fica `disabled`.
- `PendingIndicator`: renderiza o mesmo nó (mesmo tamanho) ligado e desligado — snapshot de
  dimensão não muda; é `aria-hidden`.
- Área de resultados: `aria-busy="true"` enquanto pendente e `"false"` depois; nenhum card é
  desmontado durante a transição (a lista antiga permanece no DOM).
- E2E (`e2e/loading-filtros.spec.ts`): com a navegação atrasada artificialmente (`page.route` com
  delay), digitar mostra o spinner e a grade esmaecida; ao resolver, ambos somem e a grade traz o
  novo conjunto. Com navegação instantânea, o spinner não chega a ficar visível (delay de 100ms).

Verificação manual (`pnpm dev`):

- Digitar rápido: sem flicker do spinner em rede normal; com throttling (Slow 3G), spinner e
  esmaecimento aparecem e somem juntos.
- Sem layout shift ao ligar/desligar o indicador (comparar antes/depois no DevTools).
- Foco do teclado no input não é perdido durante a transição; Tab continua alcançando o `<select>`.
- 375px: os spinners não empurram os controles nem geram scroll horizontal.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Barra de progresso global de navegação (topo da página) — o feedback aqui é local aos filtros.
- Loading dos links de paginação (story 04 usa `<Link>`; se precisar, é `useLinkStatus`, outra story).
- Cancelar a requisição em voo ao digitar de novo — o `useTransition` já descarta o resultado
  obsoleto e o catálogo é cacheado.
- Otimistic UI (filtrar no cliente antes da resposta do servidor).
- Estado de loading da listagem em scroll infinito — item seguinte do backlog.
