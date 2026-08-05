# Plan: migração para slices verticais e responsabilidade única

## Context

O `CLAUDE.md` passou a documentar a arquitetura-alvo (commits `3d39299` e `c534f0e`): vertical
slices em `features/`, camadas recortadas pela fronteira servidor/cliente (Model → Data → View →
estado de cliente) e responsabilidade única com cheiros objetivos. O ESLint já trava parte disso
(`max-lines` 150, `max-lines-per-function` 80, `no-restricted-imports` por slice).

O código, porém, é anterior ao documento: estrutura flat (`components/pokemon|search|ui`, `lib/`) e
quatro arquivos isentos por `OVERSIZED_LEGACY` — `TypeFilter`, `VirtualGrid`, `PokemonDetail` e
`SearchInput`. Enquanto a isenção existir, o padrão vale só no papel para exatamente os arquivos que
o motivaram.

Esta story é **refatoração pura**. O que a destrava:

- **Nenhuma mudança de comportamento observável.** Mesma UI, mesmas URLs, mesma árvore de
  acessibilidade, mesma estratégia de cache e render. A suíte e2e não é tocada: ela consulta por
  papel e rótulo, então continuar verde **sem editar spec** é a prova de que nada mudou. Spec que
  precisar mudar é regressão, não ajuste.
- **`OVERSIZED_LEGACY` termina vazio.** Sair da lista é entregável, não consequência: os quatro
  arquivos são decompostos, não apenas movidos de pasta.
- **Fases com verde entre elas.** Cinco fatias, cada uma commitável e com a suíte inteira passando.
  Refatoração que fica dias vermelha perde a única rede que tem.
- **Decisão de nomes já travada** pelo `CLAUDE.md`: slices `catalog`, `search` e `pokemon-detail`;
  compartilhado sobe para `lib/api/`, `lib/` ou `components/ui/`.

Fora do que o `CLAUDE.md` já decidiu, duas escolhas ficam registradas aqui:

- **`TypeBadge` sobe para `components/ui/`.** É usado por `catalog` (card) e por `pokemon-detail`;
  deixá-lo em qualquer um dos dois criaria import cruzado, que o ESLint barra.
- **`FilterTransition` vira `components/shared/`.** É estado partilhado entre os controles
  (`search`) e a área de resultado (`catalog`) — mesmo motivo, mas é estado com provider, não
  apresentação genérica, então não cabe em `components/ui/`.

## Desenho

### Alvo por slice

```
features/catalog/
  CatalogPage.tsx        de app/page.tsx (o PokemonResults e a composição da tela)
  data.ts                getListing(): catálogo + tipos + parse + applyFilters + paginateCumulative
  actions.ts             loadPokemonPage ("use server"), de app/actions.ts
  lib/                   grid.ts, pagination.ts, empty-description.ts (buildEmptyDescription)
  hooks/                 useGridColumns.ts, useInfiniteList.ts, useVirtualRows.ts
  components/            InfiniteList, VirtualGrid, PokemonGrid, PokemonCard,
                         PokemonGridSkeleton, ResultCount, ResultsArea, ListStatus,
                         LoadMoreSentinel

features/search/
  FilterBar.tsx          composição dos controles
  data.ts                getFilterTypes() (hoje `getTypes` chamado direto na FilterBar)
  lib/                   filters.ts, search.ts, type-selection.ts (triggerLabel, toggleType)
  hooks/                 useTypeSelection.ts, useSearchField.ts
  components/            SearchInput, TypeFilter, TypeOptions, ClearFiltersAction,
                         ClearFiltersLink

features/pokemon-detail/
  data.ts                getDetail(name) sobre getPokemonByName
  components/            PokemonDetail + os pedaços extraídos dele

compartilhado (não muda de dono)
  lib/api/*, lib/search-params.ts, lib/url.ts, lib/format.ts, lib/site.ts, lib/utils.ts
  components/ui/*  (+ TypeBadge)
  components/shared/FilterTransition.tsx
```

`app/` fica só com roteamento: `layout.tsx`, `page.tsx` (metadata + `<Suspense>` + `<CatalogPage>`),
`pokemon/[name]/page.tsx` (metadata + `generateStaticParams` + `notFound()` + componente do slice),
`loading|error|not-found`, `robots.ts`, `sitemap.ts`. `generateStaticParams` e `generateMetadata`
**continuam na rota** — o Next só os reconhece ali.

### Decomposição dos quatro isentos

| Arquivo         | Hoje                                                                                     | Vira                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `TypeFilter`    | rótulo + ordem canônica + espelho da URL + navegação + markup (93 l.)                    | `lib/type-selection.ts` (`triggerLabel`, `toggleType`), `hooks/useTypeSelection.ts`, `TypeFilter`, `TypeOptions` |
| `SearchInput`   | campo + debounce/transition + navegação + botão limpar (81 l.)                           | `hooks/useSearchField.ts` + `SearchInput` (só markup)                                                            |
| `InfiniteList`  | estado + server action + `replaceState` + composição (não isento hoje, mas mesmo cheiro) | `hooks/useInfiniteList.ts` + `InfiniteList` (composição)                                                         |
| `VirtualGrid`   | medição de linha + virtualizer + semântica de lista + markup (87 l.)                     | `hooks/useVirtualRows.ts` + `VirtualGrid` + componente de linha                                                  |
| `PokemonDetail` | header + sprite + stats + metadados num só componente (87 l.)                            | `PokemonDetail` (composição) + subcomponentes de bloco                                                           |

Regra em todas: o hook devolve dados prontos e handlers, **sem JSX**; o componente não conhece URL,
server action nem virtualizer.

### Fases (cada uma termina verde e commitável)

1. **Compartilhado** — criar `components/shared/`, mover `FilterTransition` e subir `TypeBadge` para
   `components/ui/`. Só imports mudam.
2. **`pokemon-detail`** — slice menor, prova o padrão ponta a ponta (rota → `data.ts` → View) e
   decompõe `PokemonDetail`. Sai de `OVERSIZED_LEGACY`.
3. **`search`** — move controles e regras puras, extrai `type-selection`, `useTypeSelection` e
   `useSearchField`. `TypeFilter` e `SearchInput` saem de `OVERSIZED_LEGACY`.
4. **`catalog`** — `data.ts` + `actions.ts`, `app/page.tsx` vira composição, extrai
   `useInfiniteList` e `useVirtualRows`. `VirtualGrid` sai de `OVERSIZED_LEGACY`.
5. **Fechamento** — `OVERSIZED_LEGACY` vazio; conferir `SLICES` do `eslint.config.mjs`; incluir
   `features/**` no `coverage.include` do `vitest.config.mts`; atualizar a árvore da seção
   "Arquitetura" do `README.md`.

Testes do Vitest **migram junto com o arquivo testado**, com os asserts intactos. Assert que precisa
mudar é sinal de comportamento alterado — parar e revisar, não reescrever o teste.

## Validação

### Comandos (todos, ao fim de cada fase)

```bash
pnpm run format:check
pnpm run lint          # no Windows sempre `pnpm run lint`
pnpm run typecheck
pnpm test
pnpm run build
pnpm run test:e2e      # antes da primeira vez: pnpm exec playwright install chromium
```

### O que precisa estar provado

- **Comportamento intacto:** `e2e/` inteiro verde **sem nenhuma edição de spec nem de
  `e2e/locators.ts`** — listagem, busca, filtro múltiplo, scroll infinito, virtualização, detalhe,
  SEO, a11y (axe) e os dois projetos de erro (`fail-catalog`, `fail-detail`).
- **Testes migrados:** todo `*.test.tsx` acompanha seu arquivo e passa com os mesmos asserts. O
  `pnpm run test:coverage` não perde caminho coberto (comparar com a execução anterior à migração).
- **Cobertura do que foi extraído** — código novo, teste novo:
  - `triggerLabel`: zero tipos ("Todos os tipos"), um, dois (nomes sempre inteiros), acima do
    orçamento de caracteres ("fire, water +2 tipos"), singular/plural do resto.
  - `toggleType`: marcar e desmarcar devolvem sempre a ordem do catálogo, nunca a de clique.
  - `useTypeSelection`: espelho otimista durante o pending, ressincronização quando a URL muda,
    reset pelo `clearToken`.
  - `useSearchField`: digitação, limpar, e a navegação disparada com a query correta.
  - `useInfiniteList`: trava síncrona contra chamada concorrente, append da fatia, `hasMore` no
    fim da lista, erro da action, `replaceState` com o `?page=` certo.
  - `useVirtualRows`: colunas por largura, altura medida sobrepondo a estimada.
- **Gates estruturais:** `pnpm run lint` limpo com `OVERSIZED_LEGACY` **vazio**; nenhum import
  cruzado entre slices (a regra falha sozinha se houver).
- **Render e cache inalterados:** `pnpm run build` continua prerenderizando as 100 rotas de detalhe
  e o shell da listagem — conferir na saída do build que nada virou dinâmico.

### Verificação manual (`pnpm dev`)

- `/` — grade carrega, contador anuncia o total, rolar até o fim acumula as fatias e o `?page=`
  acompanha na barra de endereços.
- `/?q=char` e filtro com dois tipos marcados — spinner aparece no controle usado, a grade fica
  esmaecida com `aria-busy`, o gatilho mostra os nomes selecionados.
- Combinação sem resultado — estado vazio com a descrição certa e o botão de limpar filtros.
- `/pokemon/pikachu` — detalhe completo; "voltar" retorna à listagem com busca, filtro e cursor.
- Responsividade: dropdown de tipos em uma coluna abaixo de 380px; grade de 1 a 4 colunas.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm run lint` e `pnpm run build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- **Qualquer mudança de comportamento, layout, texto ou URL.** Bug encontrado durante a migração
  vira story própria; corrigir junto esconderia a regressão no meio do diff.
- Mudar estratégia de render ou cache (`cacheComponents`, `"use cache"`, `generateStaticParams`).
- Novas features, novos estados de UI, Storybook.
- Editar `e2e/*.spec.ts` ou `e2e/locators.ts` — se precisarem mudar, o refactor quebrou algo.
- Trocar o `shadcn/ui` por outra base, ou expandir o uso dele.
- Renomear os slices ou criar slice novo além dos três decididos.
