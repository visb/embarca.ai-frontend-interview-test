@AGENTS.md

# Guia deste projeto para IA

Pokédex do teste técnico da embarca.ai: **Next.js 16 (App Router) + React 19 + TypeScript strict +
Tailwind 4**, app único (não monorepo), `pnpm` 11, Node 22. Consome a [PokeAPI](https://pokeapi.co).

- **Decisões técnicas e trade-offs já travados:** [`README.md`](./README.md) — ler antes de propor
  arquitetura diferente; quase toda alternativa óbvia já foi avaliada e registrada lá.
- **História de cada entrega:** [`stories/`](./stories) (`done/` = entregue). O git diff guarda o
  _quê_; as stories guardam o _porquê_.
- **Enunciado original:** [`docs/desafio.md`](./docs/desafio.md).

---

## Arquitetura: vertical slices + camadas de fronteira servidor/cliente

Duas ideias, e só duas:

1. **Vertical slice** — uma pasta por domínio, autossuficiente. Recorte de pasta, vale em qualquer
   framework.
2. **Camadas dentro do slice** — recortadas pela **fronteira servidor/cliente**, que no App Router
   é a costura arquitetural de verdade: ela decide o que roda uma vez no servidor, o que vira
   bundle e o que precisa ser serializável.

> **Por que não MVVM.** ViewModel é objeto com estado, observado pela View. Server Component não
> tem estado nem ciclo de vida — renderiza uma vez e morre. Nomear a camada de servidor de
> "ViewModel" convida a colocar `useState`/React Query onde o servidor já resolveu, que é o oposto
> da decisão nº 1 do README (estado na URL). O que o MVVM comprava — **dados e lógica nunca dentro
> do JSX** — continua obrigatório aqui, com nome honesto.

> **A estrutura já está aplicada** (story 24): `features/catalog`, `features/search` e
> `features/pokemon-detail`, com `components/shared` e `components/ui` para o que atravessa slice.
> Não há mais isenção herdada — o que segue vale para todo arquivo, novo ou antigo.

### Vertical slice (fatia por domínio)

```
features/<domínio>/       ← catalog, search, pokemon-detail
  <Domínio>Page.tsx       ← composição: a rota chama isto e nada mais
  data.ts                 ← acesso a dado do slice (servidor): "use cache" + cacheLife
  actions.ts              ← "use server" do domínio, quando houver
  lib/                    ← regras puras (sem React, sem I/O)
  components/             ← UI; Server Component por padrão
  hooks/                  ← estado de cliente — só quando há interação
```

Regras do slice:

- **Autossuficiente:** um slice não importa `lib/`, `components/` ou `hooks/` internos de **outro**
  slice. O compartilhado sobe para `lib/api/` (I/O + modelo de domínio), `lib/` (puro) ou
  `components/ui/` (apresentação genérica).
- **`hooks/` é exceção, não camada obrigatória.** Slice sem pasta `hooks/` é sucesso — significa
  que o servidor resolveu tudo. Criar hook só quando existe interação que a URL não cobre.
- **A borda do slice** é a `<Domínio>Page` e os componentes/hooks exportados com nome próprio.
  Nunca estado cru nem helper interno.
- **Domínio novo = pasta nova em `features/`**, não mais um arquivo solto em `components/`.

Onde cada domínio mora hoje (a árvore completa está no `README.md`):

| Slice            | Cobre                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`        | Listagem: pipeline de filtro/paginação, grade virtual, scroll infinito, card                                                                                                      |
| `search`         | Controles: campo de busca, filtro de tipos, barra                                                                                                                                 |
| `pokemon-detail` | Página de detalhe, metadata de SEO, link de volta                                                                                                                                 |
| _compartilhado_  | `lib/api/*`, `lib/search-params`, `lib/url`, `lib/format`, `components/ui/*`, e `components/shared/*` para estado que dois slices usam (`FilterTransition`, `ClearFiltersAction`) |

Regra prática do compartilhado: **dois slices usando a mesma coisa não é coincidência, é sinal de
que ela não pertence a nenhum dos dois.** Subir é a correção; o gate do ESLint acusa quando não se
faz isso.

### Camadas dentro do slice

| Camada             | Roda                | Onde vive                                         | Regras                                                                                                                                    |
| ------------------ | ------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Model**          | servidor            | `lib/api/`, `features/<d>/lib/`                   | Sem React. `lib/api/http.ts` é o **único** `fetch`; resposta crua (`*Response`) só sai por mapper; regras de domínio são funções puras.   |
| **Data**           | servidor            | `features/<d>/data.ts`, `features/<d>/actions.ts` | Compõe Model: busca (`Promise.all`), parseia params, roda o pipeline. `"use cache"` + `cacheLife("max")` vivem aqui. Devolve dado pronto. |
| **View**           | servidor por padrão | `features/<d>/<Domínio>Page.tsx`, `components/`   | Recebe dado pronto e renderiza. Sem fetch, sem regra de negócio. `"use client"` só na folha que precisa de evento.                        |
| **Estado cliente** | cliente             | `features/<d>/hooks/`                             | Só o que a URL não cobre: pending de transition, scroll infinito, espelho otimista. Devolve dados prontos + handlers; nada de JSX.        |

Fluxo: **rota → `<Domínio>Page` → `data.ts` → Model**. A View nunca pula para o I/O; a camada de
dado nunca renderiza.

### O que isso proíbe

- ❌ **Lógica dentro da rota.** `app/**/page.tsx` só declara `metadata`, monta `<Suspense>` e chama
  a page do slice.

  ```tsx
  // ✅ app/page.tsx — roteamento
  export default function Home(props: PageProps<"/">) {
    return <CatalogPage searchParams={props.searchParams} />;
  }

  // ✅ features/catalog/data.ts — camada de dado
  export async function getListing(params: RawListingParams): Promise<Listing> {
    const [catalog, types] = await Promise.all([getPokemonCatalog(), getTypes()]);
    const filters = parseListingParams(params, types);
    return { filters, ...paginateCumulative(applyFilters(catalog, filters), filters.page) };
  }
  ```

- ❌ **Estado ou I/O dentro do JSX.** Scroll infinito, chamada de server action e sincronização de
  URL saem do componente e viram hook do slice (`features/catalog/hooks/useInfiniteList.ts`); o
  componente só recebe `items`, `loading`, `onLoadMore`. Mesmo corte no `TypeFilter` →
  `useTypeSelection` e na grade virtual → `useVirtualRows`.
- ❌ **Import cruzado entre slices.** Sobe para o compartilhado ou ganha nome próprio.
- ❌ **`"use client"` acima da folha.** A diretiva contamina toda a subárvore importada: subir uma
  linha pode arrastar a grade inteira para o bundle. Se um componente client precisa de markup
  pesado, passar como `children` do servidor em vez de importar.
- ❌ **Prop não serializável cruzando a fronteira.** O que vai de Server para Client Component é
  JSON (mais `ReactNode` e server action). Classe, `Date` com método, closure — não atravessam.
- ❌ `fetch` fora de `lib/api/http.ts`, ou acesso a dado de domínio sem `"use cache"`.
- ❌ **`await searchParams` fora do bloco que usa.** Ler no topo da rota derruba o shell
  prerenderizado inteiro para dinâmico; cada bloco dependente de request fica atrás do seu
  `<Suspense>` e streama.
- ❌ Query string montada à mão (`` `?q=${q}&page=${p}` ``) — usar `buildQuery` + `listingHref`.
  As três regras (chave vazia some, `page=1` some, mexer em `q`/`type` zera `page`) moram lá.
- ❌ `any` (ESLint `error`) ou resposta crua da API tipada direto na View.
- ❌ Estado de UI reinventado: reusar `useFilterTransition()` (pending compartilhado + `aria-busy`),
  `PendingIndicator`, `EmptyState`, `Skeleton`, `ListStatus`.
- ❌ Componente acima de ~150 linhas ou com duas responsabilidades visuais — quebrar.
- ❌ `import { Foo }` para tipo — ESLint exige `import type` separado.

### Responsabilidade única, na prática

Um arquivo tem **uma razão para mudar**. Os cheiros abaixo são objetivos — dá para apontar sem
discutir gosto, e cada um tem destino certo:

| Cheiro no arquivo do componente                         | Para onde vai                         |
| ------------------------------------------------------- | ------------------------------------- |
| Função pura definida junto do JSX                       | `features/<d>/lib/`                   |
| Constante de calibração (limite, orçamento, breakpoint) | `features/<d>/constants.ts` ou `lib/` |
| `useState` que espelha ou sincroniza a URL              | `features/<d>/hooks/use*.ts`          |
| Chamada de server action / `history.replaceState`       | `features/<d>/hooks/use*.ts`          |
| Dois `useState` que não mudam pelo mesmo motivo         | dois hooks, ou um hook e uma prop     |
| Doc comment no topo explicando dois assuntos            | dois arquivos                         |
| Mais de ~150 linhas, ou ~80 de JSX                      | extrair o pedaço repetido do markup   |

**Caso de referência — o `TypeFilter`.** Antes da story 24 ele era um arquivo de 188 linhas com
cinco motivos para mudar: rótulo do gatilho (`triggerLabel` + `MAX_LABEL_CHARS`), ordem canônica do
toggle, espelho local sincronizado com a URL e com o `clearToken`, montagem da URL e navegação, e o
markup do popover. Um teste que quebrava não dizia qual dos cinco quebrou. Hoje:

```
features/search/
  constants.ts                 MAX_LABEL_CHARS
  lib/type-selection.ts        triggerLabel(selected), toggleType(known, selected, type, checked)
  hooks/useTypeSelection.ts    espelho local, sync com URL/clearToken, navigate
  components/TypeFilter.tsx    composição: campo + gatilho + <TypeOptions>
  components/TypeOptions.tsx   fieldset de checkboxes (dumb: recebe types/selected/onToggle)
```

O ganho não é estética, é testabilidade: `triggerLabel` e `toggleType` são exercitados sem render,
e `TypeOptions` sem URL. Antes, qualquer um dos três exigia montar o dropdown inteiro. Use este
corte como molde ao quebrar o próximo componente.

**Antes de dar por pronto um componente:** dá para descrever o que ele faz em uma frase, sem "e"?
Se não, o "e" é a linha de corte.

**O ESLint trava parte disso** (`eslint.config.mjs`), para não depender de revisão:

- `max-lines` 150 e `max-lines-per-function` 80 em `components/**`, `features/**` e `app/**`
  (`.tsx`), ignorando comentário e linha em branco — este projeto documenta decisão no arquivo, e
  cobrar isso empurraria na direção errada.
- `no-restricted-imports` por slice: `features/<a>/` não importa `lib/`, `hooks/` nem `components/`
  de `features/<b>/`. A raiz do slice (`data.ts`, `FilterBar.tsx`, `<Domínio>Page.tsx`) é a
  superfície pública e continua importável. **Slice novo só ganha fronteira depois de entrar no
  array `SLICES`** do config.
- `app/**` não importa `features/*/lib/**` nem `features/*/hooks/**` — a rota compõe.
- `OVERSIZED_LEGACY` **está vazio** e é para continuar assim: era a lista de dívida herdada, zerada
  pela story 24. Arquivo novo não entra — se precisa da exceção, precisa é ser quebrado.

### Regras de fronteira deste projeto

- **Estado da listagem mora na URL**, não em client state: `?q=`, `?type=`, `?page=` lidos por
  Server Component. Sem React Query — a alternativa criaria um segundo source of truth e três
  controles para manter sincronizados. Espelho local só onde `useTransition` segura a URL antiga
  (`SearchInput`, `TypeFilter`) e **sempre com comentário justificando**.
- **URL só se monta em `lib/url.ts`** (`buildQuery`/`listingHref`) e só se lê em
  `lib/search-params.ts` (`parseQueryParam`/`parseTypeParams`/`parsePageParam`). Entrada de server
  action é entrada de usuário: passa pelos mesmos parsers.
- **Pipeline único:** `applyFilters` (nome **E** (tipo **OU** tipo)) → paginação. A server action
  `loadPokemonPage` refaz o mesmo pipeline, com os mesmos parsers, para rolar e recarregar nunca
  divergirem.
- **404 da PokeAPI é valor de retorno (`null`), não exceção** — erro lançado atravessa a fronteira
  do `"use cache"` sem identidade de classe. Ver `getPokemonByName`.
- **`loading.tsx` / `error.tsx` / `not-found.tsx` são View do slice**, não enfeite da rota: cada um
  é um estado real da tela e tem cobertura e2e.

---

## Convenções

- **Textos e comentários em pt-BR, mas o código é ASCII: sem acentos em comentário ou string de
  código** (`"Numero da pokedex"`, não `"Número"`). Markdown (`README`, `stories/`) usa acentuação
  normal. Manter o padrão do arquivo que estiver tocando.
- **Comentário explica o porquê e o trade-off**, nunca o que a linha já diz. Toda decisão não óbvia
  ganha doc comment no módulo/função — é a densidade esperada aqui.
- Prettier: `printWidth` 100, aspas duplas, ponto e vírgula, `trailingComma: all`,
  `prettier-plugin-tailwindcss`. Formatação é do Prettier; ESLint só trava problema real.
- Imports pelo alias `@/*`. Named exports; `interface FooProps` logo acima do componente.
- Tailwind hand-rolled. `shadcn/ui` entrou **só** para `Popover` e `Checkbox` — não expandir sem
  decisão registrada (tema por `prefers-color-scheme`, não por classe).
- **Acessibilidade é requisito, não acabamento:** nome acessível estável em controle cujo rótulo
  muda, `aria-busy` na área de resultado, `aria-setsize`/`aria-posinset` sob virtualização, foco
  visível. Mudança de markup que quebra isso quebra teste — e é essa a intenção.

## Testes

Dois runners por um motivo: os docs do Next dizem que o Vitest não suporta Server Component
assíncrono e recomendam e2e para eles. Isso **é** o critério de divisão — cada camada tem o seu:

| Camada           | Runner                                                         |
| ---------------- | -------------------------------------------------------------- |
| Model, lib puro  | Vitest (unit), `fast-check` onde a propriedade for expressável |
| Data (servidor)  | Playwright, pela rota — não dá para montar no jsdom            |
| View de servidor | Playwright                                                     |
| View de cliente  | Vitest + Testing Library                                       |
| Estado cliente   | Vitest, no hook ou pelo componente que o consome               |

- **Vitest** — `*.test.ts(x)` **colocado ao lado** do arquivo, dentro do slice. Fixtures em
  `test/fixtures/pokemon.ts` (`makeSummary`).
- **Playwright** — `e2e/*.spec.ts`. Locators compartilhados em `e2e/locators.ts`; PokeAPI
  substituída pelo mock de fixtures (`e2e/mock-api/`, `MOCK_MODE` = `ok` | `fail-catalog` |
  `fail-detail`). Caminho de erro é o projeto `chromium-erros`.
- **Consulta sempre por papel ou rótulo** — nunca `data-testid`, classe ou id. Seletor de CSS passa
  verde em mudança que quebra o leitor de tela.
- Nome do teste descreve o comportamento em pt-BR: `"o card inteiro e um link achavel pelo nome"`.
- Caminho novo ou alterado sem teste correspondente não entra. Sem `skip`/`only` sem justificativa.

## Fluxo de trabalho

- **Planejar antes de codar:** `/issue` (uma story) ou `/planning` (refina o `stories/BACKLOG.md`).
  Story em `stories/NN-slug.md`, seções Context / Desenho / Validação / Fora de escopo. As skills
  **só planejam e commitam o `.md`** — implementar é passo separado, sob pedido explícito.
- Story que migra estrutura declara **qual slice** move e por quê; migração pega carona na feature.
- Commits: **Conventional Commits em pt-BR** (`fix(filtros): ...`), escopo curto.
- **Nunca** criar branch, push, PR ou merge sem pedido explícito.
- Antes de usar API do Next: ler o guia em `node_modules/next/dist/docs/` (ver `AGENTS.md`) — esta
  versão tem breaking changes.

## Validação (gates)

Ordem do CI, e a ordem para rodar localmente:

```bash
pnpm run format:check   # o CI roda em modo verificação; `pnpm run format` corrige
pnpm run lint
pnpm run typecheck
pnpm test               # Vitest, execução única
pnpm run build          # prerenderiza as 100 rotas; pega diretiva de cache mal aplicada
pnpm run test:e2e       # Playwright, dois projetos (feliz + erro)
```

- **Windows: sempre `pnpm run lint`** — `pnpm lint` colide com o `lint.bat` do Android SDK no PATH.
- Antes do primeiro e2e: `pnpm exec playwright install chromium`.
- Iterar mais rápido no e2e: `PW_DEV=1 pnpm run test:e2e`. Porta ocupada: `PORT=4000`.
  Contra a API real (fora do CI): `PW_LIVE=1 pnpm run test:e2e --project=chromium`.
- `pnpm run build` bate na PokeAPI de verdade (1 + 100 requisições). Falha intermitente da API é
  motivo para repetir, não para mexer no cache.
