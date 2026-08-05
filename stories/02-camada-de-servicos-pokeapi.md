# Plan: Camada de serviços da PokeAPI (tipos, cache e erros)

## Context

O README pede "camada de serviços HTTP", "TypeScript obrigatório", "separação entre UI e lógica",
"tratamento consistente de erros" e "evitar chamadas desnecessárias". Esta story é a espinha
dorsal: todas as telas consomem daqui.

**Problema real da PokeAPI que dita o desenho:** `GET /pokemon?limit=100&offset=0` devolve apenas
`{ name, url }` por item — **não traz tipos nem imagem**. Mas o card exigido pelo README precisa de
nome, imagem, tipos e ID. Logo, a listagem obriga 1 (índice) + 100 (detalhes) requisições.

Decisões travadas:
- Montar um **catálogo normalizado em memória** dos 100 primeiros pokémons (`id`, `name`, `types`,
  `spriteUrl`), resolvido uma vez e cacheado. Busca, filtro e paginação operam sobre esse catálogo.
- Cache via **Cache Components** do Next 16: `cacheComponents: true` no `next.config.ts` e diretiva
  `'use cache'` + `cacheLife()` nas funções de serviço. Motivo: neste Next, `fetch` **não é cacheado
  por default** (`node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`) — sem
  isso seriam 101 requisições por request. Pokédex é dado praticamente imutável, então `cacheLife`
  longo (`'days'`/`'max'`) é seguro.
- `GET /type` serve **só** para popular as opções do filtro. Não usar `/type/{name}` para filtrar:
  o catálogo já tem os tipos em memória, e filtrar lá evita round-trip e mantém a combinação
  busca+filtro coerente (ver [06-filtro-por-tipo](./06-filtro-por-tipo.md)).
- Erros nunca vazam `Response` crua: o cliente HTTP normaliza em um erro de domínio com `status`.

Trade-off aceito: as 100 chamadas de detalhe no primeiro cold start pesam. Aceitável porque o
resultado é cacheado e o limite fixo de 100 vem do próprio enunciado.

## Desenho

- `lib/api/http.ts` — wrapper fino sobre `fetch`: base URL `https://pokeapi.co/api/v2`, checagem de
  `res.ok`, parse tipado, erro de domínio `PokeApiError { status, url }`, distinção 404 vs 5xx.
- `lib/api/types.ts` — tipos das respostas cruas (`PokemonListResponse`, `PokemonDetailResponse`,
  `TypeListResponse`) **e** dos modelos de domínio (`PokemonSummary`, `PokemonDetail`, `PokemonType`).
  Sem `any`.
- `lib/api/pokemon.ts`:
  - `getPokemonCatalog(): Promise<PokemonSummary[]>` — `'use cache'` + `cacheLife('days')`; busca o
    índice (limit=100) e resolve os detalhes com `Promise.all`, mapeando para `PokemonSummary`.
  - `getPokemonByName(name): Promise<PokemonDetail>` — `'use cache'`; 404 vira erro tipado para a
    página de detalhe chamar `notFound()`.
  - `getTypes(): Promise<PokemonType[]>` — `'use cache'`; usado pelo filtro.
- `lib/api/mappers.ts` — funções **puras** raw→domínio (extrai `id` da URL, escolhe a arte oficial
  como `spriteUrl` com fallback para `sprites.front_default`, ordena tipos por `slot`, limita moves).
  São puras de propósito: é o que o unit test cobre sem rede.
- `next.config.ts` — `cacheComponents: true` e `images.remotePatterns` liberando
  `raw.githubusercontent.com` (arte oficial) e `assets.pokemon.com`/`raw` conforme o sprite escolhido.
- Ler `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` antes de escrever as
  diretivas — a API mudou nesta versão.

## Validação

Comandos:
- `pnpm typecheck`, `pnpm lint`, `pnpm build` — limpos. O `build` é o gate real do `cacheComponents`:
  se a diretiva estiver mal aplicada, ele falha.
- `pnpm test` — unit dos mappers e do cliente HTTP (fetch mockado via `vi.stubGlobal`).

Casos a cobrir:
- `mappers`: extrai `id` correto de `.../pokemon/25/`; monta `spriteUrl`; ordena tipos por `slot`;
  cai no fallback quando a arte oficial é `null`; limita moves a 5 preservando a ordem.
- `http`: 200 devolve o payload parseado; 404 lança `PokeApiError` com `status: 404`; 500 lança com
  `status: 500`; corpo inválido/JSON quebrado não derruba com `TypeError` cru.
- `getPokemonCatalog`: com fetch mockado, devolve 100 itens no formato de domínio; uma falha
  individual de detalhe propaga erro (não devolve lista pela metade e silenciosa).
- `getPokemonByName`: nome inexistente → erro 404 tipado.

Verificação manual:
- `pnpm build` e conferir no log que a home foi prerenderizada; segundo `pnpm start` não dispara
  novas chamadas à PokeAPI (cache funcionando).

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Qualquer UI/componente — só a camada de dados.
- Paginação/busca/filtro (só o catálogo cru; a lógica é das stories 04–06).
- Cache client-side (React Query e afins) — a decisão foi Server Components + `use cache`.
- Suporte a mais de 100 pokémons / scroll infinito.
