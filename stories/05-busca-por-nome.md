# Plan: Busca por nome

## Context

Requisito 2 do README: buscar por nome, a paginação se adaptar ao resultado e tratar o cenário
"sem resultado".

Decisões travadas:
- Termo na URL (`/?q=pika`), mesmo padrão da [04-paginacao](./04-paginacao.md). Filtragem acontece
  no Server Component sobre o catálogo cacheado — **não** chama a PokeAPI a cada tecla ("evitar
  chamadas desnecessárias", requisito 5).
- Input é o único Client Component da tela: `'use client'` + `useRouter().replace()` com **debounce
  de ~300ms**, usando `replace` (não `push`) para não entupir o histórico com um estado por letra.
- Buscar altera o subconjunto → **`page` é resetada para 1** ao mudar `q`. Sem isso o usuário
  digita e cai numa página vazia.
- Match: `includes` case-insensitive sobre o nome normalizado (sem acento/hífen). Substring, não
  prefixo — buscar "chu" deve achar "pikachu".

Trade-off aceito: sem fuzzy match / tolerância a typo. Escopo de 100 nomes curtos não justifica.

## Desenho

- `lib/search.ts` — puro: `filterByName(items, q)` com normalização
  (`.toLowerCase().normalize('NFD')`, remove diacríticos e `-`); `q` vazio/só espaço devolve a lista
  intacta (sem cópia desnecessária).
- `lib/search-params.ts` — adicionar `parseQueryParam` (trim, limite de tamanho, `undefined` → `''`).
- `components/search/SearchInput.tsx` — `'use client'`; valor inicial vem do `searchParams` (para
  a URL colada já vir preenchida); debounce; ao mudar, monta a nova query preservando os outros
  params e **removendo** `page`; `<label>` associado (a11y) e botão "limpar" quando há texto.
- `lib/url.ts` — helper `buildQuery(current, patch)` que aplica um patch de params, remove chaves
  vazias e sempre zera `page` quando `q` ou `type` mudam. Usado também pela story 06.
- `app/page.tsx` — lê `q`, aplica `filterByName` **antes** de `paginate`, e passa `q` para o input.
- Estado sem resultado: reusa o `EmptyState` da story 03 com mensagem citando o termo buscado
  (`Nenhum pokémon encontrado para "xyz"`) + ação de limpar.
- Ler `.../01-app/01-getting-started/03-layouts-and-pages.md` (seção "Rendering with search params")
  antes de mexer em `useSearchParams`/`searchParams`.

## Validação

Comandos:
- `pnpm lint`, `pnpm typecheck`, `pnpm build` — limpos.
- `pnpm test` — unit de `filterByName`/`buildQuery` + componente `SearchInput` (RTL + `user-event`
  + timers fake para o debounce).
- `pnpm test:e2e` — fluxo de busca.

Casos a cobrir:
- `filterByName`: `''` e `'   '` devolvem tudo; case-insensitive (`PIKA` acha pikachu); substring
  no meio do nome; nome com hífen (`mr-mime`) achado por `mr` e por `mime`; termo sem match → `[]`.
- `buildQuery`: mudar `q` remove `page`; param vazio some da URL (não fica `?q=`); params não
  tocados são preservados.
- `SearchInput`: digitar dispara **uma** navegação após o debounce, não uma por tecla; valor
  inicial vem da URL; botão limpar zera o termo e navega.
- E2E (`e2e/busca.spec.ts`): digitar "pika" reduz a grade e a URL vira `?q=pika`; recarregar a
  página mantém o filtro e o texto no input; termo inexistente ("zzzz") mostra o estado vazio, sem
  paginação e sem erro; estar em `?page=3` e buscar volta para a página 1.

Verificação manual (`pnpm dev`):
- Digitação fluida, sem piscar a grade inteira a cada tecla.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Filtro por tipo e a combinação dos dois — [06-filtro-por-tipo](./06-filtro-por-tipo.md).
- Autocomplete/sugestões, histórico de busca, busca por ID ou por tipo dentro do mesmo campo.
- Busca server-side na PokeAPI (a API não tem endpoint de busca por substring).
