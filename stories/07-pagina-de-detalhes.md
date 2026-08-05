# Plan: Página de detalhes `/pokemon/[name]`

## Context

Requisito 3 do README: rota `/pokemon/[name]` exibindo nome, imagem, tipos, habilidades e até 5
movimentos principais.

Decisões travadas:
- Rota dinâmica com `generateStaticParams` a partir do catálogo dos 100 → as 100 páginas são
  prerenderizadas. Justificativa técnica pro README (story 11): dado imutável, ganho de SEO e
  navegação instantânea; nome desconhecido ainda funciona sob demanda.
- "Até 5 movimentos principais": a PokeAPI não expõe ranking de relevância. Critério cravado —
  **os 5 primeiros da lista `moves`** (ordem da API), documentado na UI/README como "5 primeiros
  movimentos". Não inventar métrica de "principal".
- Nome inválido → `notFound()` + `app/pokemon/[name]/not-found.tsx`. Um 404 de verdade, não uma
  mensagem de erro genérica.
- Navegação: o `PokemonCard` da story 03 vira `<Link>` para o detalhe (o card inteiro clicável,
  com o nome como texto acessível do link).

Detalhe da versão: `params` é **Promise** neste Next e precisa de `await`, inclusive em
`generateMetadata` (`.../01-app/01-getting-started/03-layouts-and-pages.md`). Ler antes de codar.

## Desenho

- `app/pokemon/[name]/page.tsx` — Server Component async; `const { name } = await params`;
  `getPokemonByName(name)`; erro 404 tipado → `notFound()`; demais erros sobem para o `error.tsx`.
- `app/pokemon/[name]/loading.tsx` — skeleton do detalhe.
- `app/pokemon/[name]/not-found.tsx` — mensagem + link de volta para a listagem.
- `app/pokemon/[name]/error.tsx` — retry, mesmo padrão da story 03.
- `generateStaticParams()` — mapeia o catálogo para `{ name }`.
- `components/pokemon/PokemonDetail.tsx` — header (imagem grande, `#ID`, nome, `TypeBadge`s),
  seção "Habilidades" (marcando as `is_hidden`) e seção "Movimentos" (até 5). Reusa `TypeBadge`.
- `components/ui/BackLink.tsx` — volta para a listagem **preservando os filtros** quando a
  navegação veio de lá (`<Link href={backHref}>` com a query recebida via `searchParams`, fallback
  `/`). Sem isso o usuário perde a busca ao voltar.
- `lib/api/mappers.ts` — mapper de `PokemonDetail` (habilidades e corte dos 5 moves) já previsto na
  story 02; aqui ele é consumido.

## Validação

Comandos:
- `pnpm lint`, `pnpm typecheck`, `pnpm build` — no log do build devem aparecer as rotas
  `/pokemon/[name]` prerenderizadas (prova o `generateStaticParams`).
- `pnpm test` — componente `PokemonDetail` + mapper do detalhe.
- `pnpm test:e2e` — fluxo de detalhe.

Casos a cobrir:
- `PokemonDetail`: renderiza nome, ID formatado, imagem com `alt`, todos os tipos, todas as
  habilidades, **no máximo 5** movimentos (mesmo recebendo 200) e nada quebra com pokémon sem
  habilidade oculta.
- Mapper: recorta 5 moves preservando a ordem; lista de moves menor que 5 não estoura.
- E2E (`e2e/detalhes.spec.ts`): clicar no card do pikachu leva a `/pokemon/pikachu` e mostra
  habilidades e movimentos; acessar `/pokemon/nao-existe` mostra o not-found (e responde 404);
  com a PokeAPI interceptada em 500, aparece a UI de erro com retry; voltar da página de detalhe
  para uma listagem filtrada preserva `?q=`/`?type=`.

Verificação manual (`pnpm dev`):
- `/pokemon/pikachu` em 375px — imagem não estoura, seções empilham.
- Navegação lista → detalhe → voltar é instantânea (prefetch dos links).

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Stats/gráficos, evoluções, cadeia de evolução, sprites shiny, áudio.
- Navegação anterior/próximo pokémon dentro do detalhe.
- `generateMetadata` da rota — [08-seo-e-metadata](./08-seo-e-metadata.md).
