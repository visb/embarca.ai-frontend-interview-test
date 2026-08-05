# Plan: README técnico com justificativa das decisões

## Context

O README atual é o **enunciado do teste**, não a documentação da solução. "README técnico" e
"SSR/SSG/ISR com justificativa" são diferenciais do README — e o enunciado diz explicitamente que
o objetivo inclui demonstrar **tomada de decisão técnica**. Sem esse documento, boa parte das
decisões (por que catálogo em memória, por que `use cache`, por que filtro não usa `/type/{name}`)
fica invisível pro avaliador.

Decisões travadas:

- **Não apagar o enunciado.** Mover para `docs/desafio.md` e escrever um `README.md` novo da
  solução, com link para o enunciado original. Perder o enunciado tira o contexto de avaliação.
- O README referencia as stories de `stories/` como registro das decisões, sem duplicar o conteúdo
  delas.
- Story penúltima: só faz sentido documentar o que já existe. A URL de produção entra depois
  ([12-deploy-vercel](./12-deploy-vercel.md)).

## Desenho

Novo `README.md`:

- **O que é / demo** — resumo em 3 linhas + link da Vercel (preenchido na story 12) + badge de CI.
- **Como rodar** — `pnpm install`, `pnpm dev`, `.env` (`NEXT_PUBLIC_SITE_URL`), versão do Node.
- **Scripts** — tabela: `dev`, `build`, `lint`, `format`, `typecheck`, `test`, `test:e2e`.
- **Arquitetura** — árvore de pastas comentada (`app/`, `components/`, `lib/api/`, `lib/`, `e2e/`)
  e a regra de separação UI × lógica: funções puras em `lib/`, I/O em `lib/api/`, componentes sem
  regra de negócio.
- **Decisões técnicas** — a seção que o avaliador vai ler. Uma subseção curta por decisão, cada uma
  com _contexto → escolha → alternativa descartada_:
  1. Server Components + `searchParams` na URL em vez de estado client + React Query.
  2. Renderização: prerender da listagem e das 100 rotas de detalhe (`generateStaticParams`);
     por que SSG/ISR e não SSR puro — dado de Pokédex é imutável.
  3. Cache: `cacheComponents: true` + `'use cache'`/`cacheLife`, porque neste Next `fetch` **não**
     cacheia por default; o custo de 1+100 requisições paga uma vez só.
  4. Catálogo normalizado em memória: a listagem da PokeAPI não traz tipo nem imagem.
  5. Filtro em memória em vez de `/type/{name}`: consistência com a busca e menos round-trips.
  6. Estratégia de testes: Vitest/RTL no que é puro e de componente, Playwright no que é async
     Server Component (recomendação dos próprios docs do Next).
  7. Tailwind (já no scaffold) em vez de CSS Modules/styled-components.
- **Limitações conhecidas e próximos passos** — limite de 100 pokémons, sem fuzzy search, sem
  multi-seleção de tipo, sem Storybook (fora de escopo assumido).
- `docs/desafio.md` — enunciado original, intacto.

## Validação

Comandos:

- `pnpm lint`, `pnpm build` — limpos (nada de código muda aqui, mas o gate vale).

Casos a cobrir:

- Não há código novo → não há teste unitário novo. O que trava esta story é a **verificação
  factual**: cada comando documentado é executado de fato antes do commit e funciona.

Verificação manual (obrigatória, item a item):

- Clonar num diretório limpo e seguir o README do zero: `pnpm install` → `pnpm dev` sobe.
- Todo script da tabela existe no `package.json` e roda.
- Todo link do README resolve (stories, `docs/desafio.md`, deploy, badge de CI).
- A árvore de pastas descrita **bate** com a real (documentar pasta que não existe é o erro mais
  provável aqui).
- Nenhuma decisão descrita contradiz o código — em especial as diretivas de cache e a estratégia
  de render, que mudaram de nome nesta versão do Next.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste; sendo story só de documentação, o gate equivalente é a verificação
> manual acima, item a item. `pnpm lint` e `pnpm build` limpos.

## Fora de escopo

- Alterar código de produto para "encaixar" no que foi documentado — documentar o que existe; se
  divergir, abrir story.
- Documentação gerada (TypeDoc), ADRs formais, CONTRIBUTING, changelog.
