# Plan: Paginação de 20 em 20 via URL

## Context

Requisito 1 do README: "paginar a listagem de 20 em 20" sobre os 100 pokémons — 5 páginas.

Decisão travada: **a página vive na URL** (`/?page=2`), lida via `searchParams` no Server Component.
Motivo: URL compartilhável, botão voltar do navegador funciona, e é o mesmo mecanismo que busca e
filtro vão usar depois — um único source of truth em vez de três estados desencontrados.

Detalhe da versão: neste Next, `searchParams` é uma **Promise** e precisa de `await`
(`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`). Ler antes de codar.

Paginação é feita **em memória** sobre o catálogo cacheado, não com `offset` na PokeAPI. Motivo: as
stories 05/06 filtram antes de paginar, e aí o `offset` da API deixa de bater com o conjunto
filtrado. Um só caminho de paginação evita duas implementações divergentes.

Trade-off aceito: parâmetro inválido (`?page=abc`, `?page=0`, `?page=99`) **não** dá 404 — clampa
para a página válida mais próxima. Página quebrada por URL torta é pior UX do que clampar.

## Desenho

- `lib/pagination.ts` — função pura
  `paginate<T>(items: T[], page: number, perPage = 20): { items: T[], page: number, totalPages: number, total: number }`,
  com clamp de `page` em `[1, totalPages]` e `totalPages >= 1` mesmo com lista vazia.
- `lib/search-params.ts` — parsing/normalização dos params (`parsePageParam`) devolvendo número
  seguro. Cresce nas stories 05/06.
- `app/page.tsx` — `searchParams: Promise<{ page?: string }>`; `await`; aplica `paginate` no
  catálogo; passa a fatia para `<PokemonGrid>` e os metadados para `<Pagination>`.
- `components/ui/Pagination.tsx` — Server Component com `<Link href="?page=N">`: anterior, próxima,
  números de página e indicador "Página X de Y". Links (não botões) para funcionar sem JS e serem
  prefetchados. `aria-current="page"` no ativo; extremos desabilitados como `<span>`, não `<a>`.

## Validação

Comandos:

- `pnpm lint`, `pnpm typecheck`, `pnpm build` — limpos.
- `pnpm test` — unit de `paginate`/`parsePageParam` + componente `Pagination`.
- `pnpm test:e2e` — navegação entre páginas.

Casos a cobrir:

- `paginate`: 100 itens → 5 páginas; página 1 devolve itens 1–20; página 5 devolve 81–100;
  `page=0` e `page=-3` clampam para 1; `page=99` clampa para 5; lista vazia → `totalPages: 1`,
  `items: []`; resto não exato (ex.: 43 itens → 3 páginas, última com 3).
- `parsePageParam`: `undefined` → 1; `"abc"` → 1; `"2"` → 2; `"2.7"` e `"1e3"` não viram lixo.
- `Pagination`: na página 1 o "anterior" não é link clicável; na última o "próxima" também não;
  o número ativo tem `aria-current="page"`.
- E2E (`e2e/paginacao.spec.ts`): home mostra 20 cards (não 100); clicar "próxima" muda a URL para
  `?page=2` e troca o conjunto de cards; voltar no navegador retorna à página 1; abrir
  `/?page=3` direto já renderiza a terceira fatia (funciona sem JS/hidratação).

Verificação manual (`pnpm dev`):

- Controles de paginação alcançáveis por teclado (Tab) e visíveis em 375px.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Interação com busca e filtro (stories 05/06 adaptam a paginação ao subconjunto).
- Scroll infinito / "carregar mais".
- Tamanho de página configurável pelo usuário.
