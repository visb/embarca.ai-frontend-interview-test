# Plan: Testes unitários e de componente

## Context

A infra de testes existe desde a [01-infra-de-testes](./done/01-infra-de-testes.md), mas só o
smoke test dela foi escrito: hoje o repo tem **um** `.test.tsx` (`ResultCount`) e **um** `.spec.ts`
(smoke). Todas as stories 02–14 fecharam com um gate de teste que nunca foi cumprido — o README
registra isso como limitação ("Sem testes automatizados", verificação foi manual).

Esta story paga a metade unit da dívida. A metade e2e fica na
[17-testes-e2e](./17-testes-e2e.md) — decisão do usuário de fatiar em duas, porque uma story com
13 stories de casos vira um bloco sem checkpoint.

O material de origem já existe: cada story de 02 a 14 tem uma seção **Validação** enumerando o que
o teste precisa provar. Esta story **não reinventa** esses casos, ela os executa — com dois ajustes
de realidade:

- **Os casos de `Pagination` da [04-paginacao](./done/04-paginacao.md) estão obsoletos.** A
  [14-infinite-scroll](./done/14-infinite-scroll-na-listagem.md) removeu o componente. `paginate` e
  `parsePageParam` continuam vivos e continuam sendo testados; o componente não existe mais.
- **A [15-virtual-list](./15-virtual-list-na-listagem.md) não foi implementada.** Nada dela entra
  aqui — quando for implementada, ela carrega os próprios testes.

### Decisão travada: testar intenção, não implementação

O pedido do usuário foi explícito. Quatro regras valem para todo arquivo desta story, e valem como
critério de revisão, não como sugestão:

1. **Query por role/label, nunca por classe ou `data-testid`.** Só `getByRole`, `getByLabelText`,
   `getByText`. Um seletor de CSS transforma o teste em refém do Tailwind; uma query por role falha
   quando a UI perde acessibilidade — que é a falha que interessa. Isso também é o que a
   [09-acessibilidade](./done/09-acessibilidade.md) já pedia.
2. **O nome do teste é a garantia, não o mecanismo.** `"filtrar volta para a primeira página"`, não
   `"chama router.replace com page=1"`. Consequência prática: **nenhuma asserção sobre mock de
   função interna** — o mock existe para isolar I/O, não para ser o sujeito da asserção. Onde o
   contrato _é_ a navegação (o `SearchInput` só existe para navegar), a asserção é sobre a **URL
   resultante**, não sobre a chamada.
3. **Invariante como propriedade no pipeline puro.** `applyFilters`/`paginate` ganham teste de
   propriedade sobre entradas geradas, não só exemplos pontuais. Exemplo prova um caso; propriedade
   prova a regra.
4. **Zero snapshot de markup.** `toMatchSnapshot` de DOM valida markup e aceita qualquer mudança com
   um `-u`. Só asserção nomeada.

Trade-off aceito: testes escritos assim são mais verbosos e demoram mais para escrever que
`expect(mock).toHaveBeenCalled()`. É o custo de um teste que ainda vale alguma coisa depois de um
refactor.

### Decisão travada: `fast-check` para as propriedades

Regra 3 pede geração de entrada. Entra `fast-check` como devDependency, restrito a `lib/` puro.
A alternativa — loop caseiro com array aleatório — daria falha sem shrinking, e o valor da
propriedade é justamente o contraexemplo mínimo que ela cospe.

Limite: propriedade **só** em função pura. Componente não vira property test.

## Desenho

### Fixtures compartilhadas

`test/fixtures/pokemon.ts` — factories, não constantes congeladas:

- `makeDetailResponse(overrides)` — payload cru da PokeAPI (formato `PokemonDetailResponse`).
- `makeSummary(overrides)` — modelo de domínio (`PokemonSummary`).
- `makeCatalog(n)` — n summaries com tipos variados, para filtro e paginação.

Factory com override, porque cada teste precisa deformar **um** campo (sprite `null`, 200 moves,
tipo duplo) e um objeto literal por teste esconderia qual campo é o sujeito.

### Unit — `lib/` puro

| Arquivo                     | Prova                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/api/mappers.test.ts`   | `extractIdFromUrl` tira 25 de `.../pokemon/25/`; `pickSpriteUrl` cai no fallback com arte oficial `null`; `mapTypes` ordena por `slot` (entrada fora de ordem); `toPokemonDetail` corta em `MAX_MOVES` preservando a ordem, e lista menor que 5 não estoura.                                                 |
| `lib/search.test.ts`        | `''` e `'   '` devolvem tudo; `PIKA` acha pikachu (case-insensitive); substring no meio; `mr-mime` achado por `mr` **e** por `mime`; termo sem match → `[]`.                                                                                                                                                 |
| `lib/filters.test.ts`       | `filterByType`: pokémon de tipo duplo aparece nos **dois** tipos; tipo desconhecido não filtra. `applyFilters`: `q` + `type` é **interseção**, não união.                                                                                                                                                    |
| `lib/pagination.test.ts`    | `paginate`: 100 itens → 5 páginas; página 5 → itens 81–100; `page=0`/`-3` clampam para 1; `page=99` clampa; vazio → `totalPages: 1`; resto não exato (43 → 3 páginas, última com 3). `paginateCumulative`: `page=4` → 80; clamp em 100 com `hasMore: false`; conjunto de 23 → `page=2` devolve 23 e encerra. |
| `lib/search-params.test.ts` | `parsePageParam`: `undefined`/`"abc"` → 1; `"2"` → 2; `"2.7"` e `"1e3"` não viram lixo; array de valores. `parseTypeParam`: fora da lista conhecida → `undefined`. `parseQueryParam`: trim.                                                                                                                  |
| `lib/url.test.ts`           | `buildQuery`: mudar `q` **remove** `page`; param vazio some (não fica `?q=`); params não tocados preservados; `listingHref` monta `/` sem `?` quando a query é vazia.                                                                                                                                        |
| `lib/format.test.ts`        | `formatPokedexNumber` zero-pad (`25 → #0025`, `1 → #0001`, `100 → #0100`); `formatPokemonName` capitaliza e trata hífen.                                                                                                                                                                                     |

**Propriedades** (`fast-check`, dentro dos arquivos acima):

- `applyFilters`: aplicar `q` e `type` em qualquer ordem dá o mesmo conjunto — trava o pipeline da
  [06-filtro-por-tipo](./done/06-filtro-por-tipo.md) contra reordenação acidental.
- `applyFilters`: o resultado é sempre **subconjunto** da entrada, e todo item do resultado satisfaz
  os dois predicados.
- `paginate`: concatenar todas as páginas de 1 a `totalPages` reconstrói a lista filtrada, sem
  buraco e sem repetição, para qualquer tamanho de entrada e qualquer `page`.
- `paginateCumulative`: `page=N` é sempre prefixo de `page=N+1`; `hasMore: false` ⟺ devolveu tudo.

### Unit — camada de I/O

- `lib/api/http.test.ts` — `fetch` via `vi.stubGlobal`. 200 devolve payload parseado; 404 lança
  `PokeApiError` com `status: 404` e `isNotFound`; 500 lança com `status: 500`; JSON quebrado vira
  `PokeApiError` (não `TypeError` cru); `fetch` que rejeita vira `status: 0` com `cause`
  preservada; path absoluto (`http://…`) não recebe a base prefixada.
- `lib/api/pokemon.test.ts` — com `pokeApiFetch` mockado: `getPokemonCatalog` devolve
  `CATALOG_SIZE` itens no modelo de domínio; **uma falha de detalhe propaga o erro** em vez de
  devolver lista pela metade (o caso silencioso é o perigoso); `getPokemonByName` inexistente →
  erro 404 tipado.
- `app/actions.test.ts` — `loadPokemonPage` com os serviços mockados: aplica `q` + `type` **antes**
  de fatiar (mesmo resultado do pipeline do servidor — a garantia que evita divergência entre rolar
  e recarregar); `page` negativo/lixo não estoura; filtro desconhecido vindo do cliente é
  neutralizado pelos parsers.

### Componente — RTL

`next/navigation` mockado por arquivo (`useSearchParams`, `useRouter`). O router mockado captura o
`href`; a asserção é sobre **a URL**, nunca sobre "foi chamado".

| Arquivo                                        | Prova                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/pokemon/PokemonCard.test.tsx`      | Achável por `getByRole('link', { name: /pikachu/i })`; mostra `#0025`; `alt` não vazio; um badge por tipo (1 tipo e 2 tipos); `listingQuery` preserva `?q=`/`?type=` no href.                                                                                                 |
| `components/pokemon/PokemonGrid.test.tsx`      | N itens → N links; `[]` → `EmptyState` e **nenhum** card; `emptyAction` renderizado quando passado.                                                                                                                                                                           |
| `components/pokemon/TypeBadge.test.tsx`        | Tipo conhecido e tipo desconhecido: ambos renderizam o nome, sem quebrar.                                                                                                                                                                                                     |
| `components/pokemon/PokemonDetail.test.tsx`    | Nome, ID formatado, imagem com `alt`, todos os tipos, todas as habilidades; recebendo 200 moves mostra **no máximo 5**; pokémon sem habilidade oculta não quebra.                                                                                                             |
| `components/pokemon/ListStatus.test.tsx`       | `total: 0` não renderiza nada; erro mostra retry e o clique chama o carregamento de novo; `hasMore: false` mostra o total e **não** mostra "Carregar mais"; carregando mostra skeleton **e** mantém o botão habilitado (desabilitar tiraria o foco).                          |
| `components/pokemon/LoadMoreSentinel.test.tsx` | Com `IntersectionObserver` stubado: entrar em viewport com `enabled` dispara uma vez; com `enabled: false` **não** dispara; o botão filho é alcançável por Tab e ativa por Enter (caminho de teclado, que scroll nunca cobre).                                                |
| `components/pokemon/InfiniteList.test.tsx`     | Ação mockada. Carregar anexa **sem desmontar** os cards existentes (os nós antigos são os mesmos); duas chamadas concorrentes viram uma; erro mantém os cards e mostra retry; retry bem-sucedido anexa; a URL vira `?page=2` via `replaceState` (o histórico **não** cresce). |
| `components/search/SearchInput.test.tsx`       | `user-event` + timers fake. Digitar "pika" navega **uma** vez, para `/?q=pika`, não uma por tecla; o valor inicial vem da URL; "Limpar" zera e navega sem `q` na URL; estar em `?page=3` e buscar produz URL **sem** `page`; o input nunca fica `disabled` e não perde foco.  |
| `components/search/TypeFilter.test.tsx`        | Uma opção por tipo + "Todos os tipos"; valor inicial da URL; trocar produz URL com `type` e **sem** `page`, preservando `q`; `<select>` nunca `disabled`; achável por `getByLabelText`.                                                                                       |
| `components/search/FilterTransition.test.tsx`  | `signalPending` liga o pending **antes** da navegação (a janela do debounce); resolve → desliga; chamadas em sequência não deixam o pending preso ligado.                                                                                                                     |
| `components/ui/PendingIndicator.test.tsx`      | É `aria-hidden`; ligado e desligado ocupam o mesmo nó (sem layout shift) — asserção sobre a presença do elemento, não sobre pixel.                                                                                                                                            |
| `components/ui/EmptyState.test.tsx`            | Título, descrição opcional e ação opcional; sem ação não renderiza botão órfão.                                                                                                                                                                                               |

`ResultsArea` fica de fora: é casca de `aria-busy` sobre o contexto, coberta pelo teste do
`FilterTransition` e pelo e2e da story 17.

### Config

- `vitest.config.mts`: adicionar `coverage.exclude` das fixtures e de `e2e/`. **Sem threshold
  numérico** — o gate segue qualitativo por story, como a 01 decidiu.

## Validação

Comandos:

- `pnpm run lint` — limpo.
- `pnpm run typecheck` — limpo (fixtures tipadas com os tipos reais de `lib/api/types`, sem `any`).
- `pnpm run format:check` — limpo.
- `pnpm test` — toda a suíte acima verde.
- `pnpm run test:coverage` — `lib/` (exceto `lib/site.ts`) e os componentes listados aparecem
  cobertos; o relatório é lido para achar **caminho não exercitado**, não para bater número.
- `pnpm build` — limpo.

Casos a cobrir: os das tabelas acima, que são os das seções **Validação** das stories 02–14 menos
`Pagination` (componente removido) e menos a story 15 (não implementada).

Verificação de que o teste testa intenção (revisão, item a item, antes do commit):

- `grep` por `data-testid`, `container.querySelector`, `getByClassName` e `toMatchSnapshot` nos
  arquivos novos → **zero ocorrência**.
- Nenhuma asserção da forma `expect(algumMock).toHaveBeenCalled…` sobre função **interna** do
  projeto. Mock de `next/navigation` e da server action é fronteira de I/O; a asserção continua
  sendo sobre a URL ou sobre o DOM resultante.
- Teste de prova negativa: quebrar de propósito uma regra no código (inverter a interseção do
  `applyFilters`, remover o clamp do `paginate`, tirar o `aria-live` do `ResultCount`) faz **um**
  teste falhar com mensagem que aponta a regra. Reverter em seguida — não commitar a quebra.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm run lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- **E2E** — [17-testes-e2e](./17-testes-e2e.md), incluindo a mudança de `POKEAPI_BASE_URL` para
  permitir mock server e os fluxos de erro server-side.
- **Story 15 (virtual list)** — não implementada; os testes dela nascem com ela.
- **Server Components assíncronos** (`app/page.tsx`, `app/pokemon/[name]/page.tsx`) — os docs do
  Next dizem que o Vitest não os suporta; cobertos por e2e na story 17.
- Threshold numérico de cobertura no CI.
- Mudança em código de produção. Se um teste desta story revelar bug, o bug vira story própria — o
  escopo aqui é escrever teste, não consertar.
- Storybook, testes de regressão visual, teste de performance.
