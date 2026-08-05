# Pokédex — teste técnico front-end

[![CI](https://github.com/visb/embarca.ai-frontend-interview-test/actions/workflows/ci.yml/badge.svg)](https://github.com/visb/embarca.ai-frontend-interview-test/actions/workflows/ci.yml)

Aplicação Next.js que consome a [PokeAPI](https://pokeapi.co) e exibe os 100 primeiros pokémons
com listagem paginada, busca por nome, filtro por tipo e página de detalhes.

O enunciado original do desafio está em [`docs/desafio.md`](./docs/desafio.md). As decisões de
cada etapa estão registradas em [`stories/`](./stories), uma story por entrega.

**Demo:** _(preenchido na story de deploy — ver [12-deploy-vercel](./stories/12-deploy-vercel.md))_

## Como rodar

Requer **Node 22+** e **pnpm 11** (o `packageManager` do `package.json` fixa a versão).

```bash
pnpm install
cp .env.example .env.local   # opcional em dev
pnpm dev
```

A única variável de ambiente é `NEXT_PUBLIC_SITE_URL`, usada pelo `metadataBase` para montar as
URLs absolutas de Open Graph e pelo `sitemap.xml`/`robots.txt`. Em desenvolvimento ela tem
fallback para `http://localhost:3000`.

> O primeiro `pnpm build` faz 1 + 100 requisições à PokeAPI para montar o catálogo e
> prerenderizar as rotas de detalhe. Se a API estiver instável, o build falha — basta repetir.

## Scripts

| Script                  | O que faz                                        |
| ----------------------- | ------------------------------------------------ |
| `pnpm dev`              | Servidor de desenvolvimento                      |
| `pnpm build`            | Build de produção (prerenderiza as 100 rotas)    |
| `pnpm start`            | Sobe o build de produção                         |
| `pnpm run lint`         | ESLint                                           |
| `pnpm run typecheck`    | `tsc --noEmit`                                   |
| `pnpm run format`       | Prettier em modo escrita                         |
| `pnpm run format:check` | Prettier em modo verificação (é o que o CI roda) |

> No Windows, use `pnpm run lint` — `pnpm lint` pode colidir com o `lint.bat` do Android SDK
> caso ele esteja no `PATH`.

## Arquitetura

```
app/                      Rotas do App Router
  page.tsx                Listagem: busca + filtro + paginação
  loading.tsx             Skeleton da listagem
  error.tsx               Error boundary com retry
  robots.ts, sitemap.ts   Metadata gerada
  pokemon/[name]/         Detalhe, com loading, error e not-found próprios
components/
  pokemon/                Card, grid, detalhe, badge de tipo, contador
  search/                 Input de busca, filtro de tipo, barra de filtros
  ui/                     Paginação, estado vazio, skeleton, link de volta
lib/
  api/                    Única camada com I/O: http, tipos, mappers, serviços
  filters.ts, search.ts   Filtro por tipo e busca por nome (puros)
  pagination.ts           Paginação em memória (pura)
  search-params.ts        Normalização dos parâmetros de URL (pura)
  url.ts                  Montagem das query strings da listagem (pura)
docs/desafio.md           Enunciado original
stories/                  Uma story por entrega, com as decisões
```

A regra de separação é simples: **`lib/api/` é o único lugar que faz I/O**, o resto de `lib/` são
funções puras, e os componentes não têm regra de negócio — recebem dados prontos e renderizam.

## Decisões técnicas

### 1. Server Components + estado na URL, em vez de estado client + React Query

Busca, filtro e página vivem em `?q=`, `?type=` e `?page=`, lidos via `searchParams` no Server
Component. URL compartilhável, botão voltar funcionando e um único source of truth.

A alternativa — estado em React + React Query — traria um segundo lugar onde a verdade mora, e
os três controles precisariam se manter sincronizados entre si. O único Client Component com
estado é o input de busca, e só para o campo responder à digitação sem esperar a rota.

### 2. Renderização: prerender da listagem e das 100 rotas de detalhe

`generateStaticParams` prerenderiza as 100 páginas de detalhe. Dado de pokédex é imutável, então
SSR puro pagaria o custo de render a cada request sem nenhum ganho de frescor.

O shell da listagem também é prerenderizado; só os blocos que dependem de `searchParams` ficam
atrás de `<Suspense>` e streamam.

### 3. Cache: `cacheComponents` + `use cache` / `cacheLife`

Nesta versão do Next o `fetch` **não** é cacheado por default. Sem Cache Components, montar o
catálogo custaria 1 + 100 requisições **por request**. Com `'use cache'` e `cacheLife('max')` nas
funções de serviço, o custo é pago uma vez.

### 4. Catálogo normalizado em memória

`GET /pokemon?limit=100` devolve só `{ name, url }` — sem tipo e sem imagem —, mas o card exige
os dois. Por isso o catálogo resolve os 100 detalhes uma vez e mantém em memória o modelo de
domínio (`id`, `name`, `types`, `spriteUrl`). Busca, filtro e paginação operam sobre esse array.

### 5. Filtro em memória, não `/type/{name}`

O catálogo já tem os tipos. Cruzar o resultado de `/type/{name}` com a busca ativa geraria
inconsistência (dois conjuntos de fontes diferentes) e round-trips extras. `applyFilters` crava a
ordem **nome → tipo**, e a paginação roda depois — um pipeline só.

### 6. Paginação em memória, não `offset` na API

Com busca ou filtro ativos, o `offset` da PokeAPI deixa de bater com o conjunto exibido. Um
caminho único de paginação evita duas implementações divergentes.

### 7. Tailwind, já presente no scaffold

CSS Modules ou styled-components exigiriam trocar o que o `create-next-app` já entregou
configurado, sem ganho para o tamanho deste projeto.

## Limitações conhecidas

- **`/pokemon/<nome-inexistente>` responde 200**, não 404, apesar de mostrar a página
  "não encontrado". Com `cacheComponents` o App Shell é enviado antes de o `notFound()` rodar, e
  `dynamicParams` — que resolveria — é incompatível com Cache Components. Como as 100 rotas
  válidas são prerenderizadas, o caso só ocorre em URL digitada à mão.
- **Sem testes automatizados.** Foram deixados fora do escopo deste projeto; a verificação de
  cada entrega foi manual, contra o build de produção.
- Escopo fixo em 100 pokémons, sem scroll infinito.
- Busca sem tolerância a erro de digitação (substring simples).
- Filtro de tipo é seleção única, não múltipla.
- Sem Storybook.
