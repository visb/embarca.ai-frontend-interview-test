# Plan: Filtro por tipo (combinado com busca e paginação)

## Context

Requisito 2 do README: filtrar por tipo, **funcionar junto com a busca**, paginação adaptada e
cenário sem resultado tratado. Fecha o trio busca + filtro + paginação.

Decisões travadas:

- Opções do dropdown vêm de `getTypes()` (`GET /type`, cacheado — story 02). A **filtragem em si é
  em memória** sobre o catálogo, não via `/type/{name}`. Motivo: o catálogo já tem os tipos, e
  cruzar dois conjuntos vindos de endpoints diferentes com a busca ativa geraria inconsistência e
  chamadas extras.
- Tipo na URL (`?type=fire`), composto com `q` e `page`.
- Ordem de aplicação fixa e única: **filtrar por nome → filtrar por tipo → paginar**. Cravado aqui
  para não existirem dois pipelines.
- Seleção **única** de tipo (não múltipla). O README pede "filtro por tipo"; multi-select adiciona
  UI e regra (AND vs OR) sem ganho pedido.
- Tipo inexistente na URL (`?type=banana`) é ignorado (tratado como sem filtro), não vira erro.

## Desenho

- `lib/filters.ts` — puro: `filterByType(items, type)`; `''`/`undefined`/tipo desconhecido devolvem
  a lista intacta. E `applyFilters(items, { q, type })` centralizando a ordem nome → tipo.
- `lib/search-params.ts` — `parseTypeParam(value, knownTypes)` validando contra a lista real.
- `components/search/TypeFilter.tsx` — `'use client'`; `<select>` nativo com `<label>` (nativo =
  teclado e leitor de tela de graça, e mobile ganha o picker do SO); ao mudar usa `buildQuery` da
  story 05 → remove `page`, preserva `q`.
- `components/search/FilterBar.tsx` — agrupa `SearchInput` + `TypeFilter` + contador de resultados
  ("23 pokémons encontrados") + botão "limpar filtros" visível só quando há filtro ativo.
- `app/page.tsx` — carrega tipos e catálogo em paralelo (`Promise.all`), aplica `applyFilters`,
  depois `paginate`.
- `EmptyState` recebe a ação "limpar filtros" (o slot previsto na story 03).

## Validação

Comandos:

- `pnpm lint`, `pnpm typecheck`, `pnpm build` — limpos.
- `pnpm test` — unit de `filterByType`/`applyFilters`/`parseTypeParam` + componentes `TypeFilter` e
  `FilterBar`.
- `pnpm test:e2e` — fluxo combinado.

Casos a cobrir:

- `filterByType`: pokémon de tipo duplo aparece nos **dois** tipos; tipo sem match → `[]`;
  `type` vazio ou desconhecido não filtra.
- `applyFilters`: `q` + `type` juntos aplicam interseção (não união); só `q`; só `type`; nenhum
  dos dois devolve tudo; ordem não altera o resultado final (propriedade que trava o pipeline).
- `parseTypeParam`: valor fora da lista de tipos conhecidos vira `undefined`.
- `TypeFilter`: renderiza uma opção por tipo + "todos"; valor inicial vem da URL; mudar navega
  preservando `q` e zerando `page`.
- E2E (`e2e/filtros.spec.ts`): filtrar por "fire" reduz a grade e todo card visível tem o badge
  fire; combinar `?q=char&type=fire` mostra só os charmander/charmeleon/charizard; a paginação
  reflete o total filtrado (some quando cabe em uma página); combinação impossível
  (`?q=pika&type=water`) cai no estado vazio com o botão limpar, que restaura a lista completa;
  URL com os três params colada direto renderiza o estado certo.

Verificação manual (`pnpm dev`):

- Filtrar estando na página 4 volta para a 1 sem tela vazia intermediária.
- `FilterBar` empilha corretamente em 375px.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Multi-seleção de tipos, filtro por geração/stats, ordenação.
- Chips de filtro ativo (o contador + "limpar" bastam).
- Persistir filtro em localStorage — a URL já é a persistência.
