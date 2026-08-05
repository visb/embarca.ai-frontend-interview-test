# Plan: Filtro de tipo com seleção múltipla (dropdown com checkboxes)

## Context

A story 06 cravou seleção **única** de tipo num `<select>` nativo, com a justificativa de que
multi-select adicionaria UI e regra (AND vs OR) sem ganho pedido. O pedido agora existe: o usuário
quer marcar vários tipos ao mesmo tempo. Esta story revoga aquela decisão e substitui o controle.

Decisões travadas nesta story:

- **Semântica OR (qualquer tipo).** Marcar fire + water mostra pokémon que tenha fire **ou** water.
  Cada tipo marcado amplia o resultado — é o que um multi-select de filtro comunica visualmente
  (mais caixas marcadas = mais coisa). AND foi descartado: além de reduzir a cada marca (o inverso
  do que a UI sugere), a maioria das combinações de dois tipos não existe no catálogo de 100
  pokémons, então quase toda interação cairia no estado vazio.
- **Sem toggle AND/OR na UI.** Um modo a mais na URL e na tela para um caso que o README não pede.
- **URL: `?type=fire,water`** — lista separada por vírgula num único param, em vez de param
  repetido (`?type=fire&type=water`). Motivo: `buildQuery` já é construído sobre `params.set()`
  (chave única), e `ClearFiltersLink`/`InfiniteList` leem `searchParams.get("type")`. Vírgula
  mantém a URL curta, colável e legível nos testes, e não obriga a reescrever a camada de URL para
  multi-valor.
- **Ordem canônica dos tipos na URL.** `parseTypeParam` devolve os tipos ordenados pela ordem do
  catálogo de tipos (não pela ordem de clique). Sem isso, `?type=fire,water` e `?type=water,fire`
  seriam URLs diferentes para o mesmo resultado — duplicando cache e quebrando as asserções de
  `toHaveURL` no e2e.
- **Duplicatas e lixo são descartados silenciosamente**, mantendo o contrato da story 06:
  `?type=banana` não é erro, só não filtra. `?type=fire,banana,fire` vira `fire`.
- **`shadcn/ui` (Radix) entra no projeto** — decisão do usuário, contra a alternativa hand-rolled.
  É a primeira dependência de UI. O que se compra: `Popover` (foco preso, Esc fecha, clique fora
  fecha, `aria-expanded`/`aria-controls` corretos) e `Checkbox` com a11y pronta, em vez de
  reimplementar gerenciamento de foco à mão. O que se paga: `components.json`, o util `cn`,
  `clsx` + `tailwind-merge` + `class-variance-authority` e os pacotes Radix.
- **Instalação mínima e cirúrgica.** Só `popover` e `checkbox` entram via CLI. Nada de reescrever
  `SearchInput`, `ClearFiltersLink` ou cards para componentes shadcn — o resto do projeto continua
  hand-rolled. `pnpm dlx shadcn@latest init` deve rodar em modo que **não sobrescreve**
  `app/globals.css` nem o Tailwind existente; se o init insistir em reescrever tokens, revisar o
  diff e manter as cores atuais (zinc) — mudança de tema não é escopo desta story.
- **Layout: duas colunas de checkboxes** dentro do popover, conforme pedido. Coluna via
  `grid grid-cols-2` — ordem de leitura permanece a do DOM (esquerda→direita, linha a linha), que
  é a que o leitor de tela e o Tab seguem. Em telas estreitas (<380px) cai para uma coluna.

## Desenho

### Camada pura (`lib/`)

- `lib/filters.ts` — `filterByType(items, types)` passa a receber `string[]`:
  - array vazio/`undefined` → lista intacta (mesmo contrato de hoje);
  - senão, `items.filter(item => item.types.some(t => types.includes(t)))` — o **OR**.
  - `ListingFilters.type` vira `types?: string[]`.
- `lib/search-params.ts` — `parseTypeParam(value, knownTypes)` passa a devolver `string[]`:
  split por vírgula, trim + lowercase de cada item, descarta desconhecidos e duplicatas, ordena
  pela posição em `knownTypes`, devolve `[]` quando não sobra nada. Nunca lança (contrato da
  camada). Renomear para `parseTypeParams` para o nome não mentir sobre a cardinalidade.
- `lib/url.ts` — `ListingParams.type` aceita `string[] | string | null`; array é serializado com
  `join(",")` e array vazio remove a chave (mesma regra de `""`). O reset de `page` ao mexer em
  `type` continua valendo.

### UI

- `components/ui/` ganha os componentes do shadcn (`popover.tsx`, `checkbox.tsx`) e
  `lib/utils.ts` com `cn`. Conviver com os componentes hand-rolled existentes (`Skeleton`,
  `EmptyState`, `PendingIndicator`) — não migrar nada.
- `components/search/TypeFilter.tsx` — reescrito:
  - trigger é um `<button>` com rótulo dinâmico: "Todos os tipos" quando vazio, o nome do tipo
    quando um só, "N tipos" quando vários. `aria-label` fixo "Filtrar por tipo" para o locator do
    e2e e o leitor de tela continuarem tendo um nome estável;
  - conteúdo: `<fieldset>` com `<legend class="sr-only">Tipos</legend>` e
    `grid grid-cols-2 gap-x-4 gap-y-2` de `Checkbox` + `<label>`, um por tipo do catálogo;
  - **navegação só ao fechar o popover**, não a cada checkbox. Marcar quatro tipos dispararia
    quatro round-trips ao servidor e quatro remounts da lista. O estado das caixas é local; ao
    fechar (Esc, clique fora, ou botão "Aplicar"), se o conjunto mudou em relação à URL, chama
    `buildQuery` + `navigate`. Se não mudou, não navega;
  - botão "Limpar tipos" dentro do popover quando há algo marcado;
  - o espelho local/`syncedType` de hoje (URL colada, botão voltar, shell prerenderizado) é
    mantido, agora comparando arrays por string canônica;
  - `PendingIndicator` continua ao lado do trigger, mesmo `useFilterTransition`.

### Consumidores

- `app/page.tsx` — `parseTypeParams` devolve array; `applyFilters(catalog, { q, types })`;
  o `key` do `InfiniteList` vira `` `${q}|${types.join(",")}` ``; `buildEmptyDescription` passa a
  lidar com plural ("Nenhum pokemon dos tipos fire, water nesta lista.").
- `app/actions.ts` (`loadPokemonPage`) — `filters.type` vira `string | string[]`, passa pelo mesmo
  parser. O cliente pode mandar qualquer coisa: a validação continua sendo do servidor.
- `components/pokemon/InfiniteList.tsx` — `filters: { q: string; types: string[] }`, repassado ao
  server action e ao `buildQuery` do cursor.
- `components/search/ClearFiltersLink.tsx` — inalterado (`searchParams.get("type")` continua
  verdadeiro para `"fire,water"`).

## Validação

### Comandos

- `pnpm lint` — limpo.
- `pnpm typecheck` — limpo (a troca `string` → `string[]` toca assinaturas em 6 arquivos; é o
  typecheck que garante que nenhum call site ficou para trás).
- `pnpm build` — limpo.
- `pnpm test` — unit + component.
- `pnpm test:coverage` — sem queda de cobertura nos módulos tocados.
- `pnpm test:e2e` — fluxos de filtro, a11y e loading.

### Casos a cobrir (unit)

`lib/filters.test.ts`:

- `filterByType` com `[]`/`undefined` devolve a lista intacta;
- um tipo → mesmo resultado do comportamento antigo (não regride a story 06);
- dois tipos → **união**, não interseção: contagem de `fire` + contagem de `water` menos os que
  têm ambos; nenhum pokémon sem nenhum dos dois sobra;
- pokémon de tipo duplo aparece uma única vez quando os **dois** tipos dele estão marcados
  (prova que não há duplicação na união);
- tipo desconhecido dentro do array não amplia nem zera o resultado;
- `applyFilters`: `q` + vários tipos aplicam interseção **entre** os critérios (nome AND
  (tipo OR tipo)) — o caso que distingue os dois níveis de combinação;
- propriedade (fast-check, já no projeto): resultado de `filterByType(items, types)` é sempre
  subconjunto de `items`, e é monotônico — adicionar um tipo ao array nunca reduz o resultado.
  Essa é a trava formal do OR.

`lib/search-params.test.ts`:

- `"fire,water"` → `["fire", "water"]`;
- `"water,fire"` → mesma saída de `"fire,water"` (ordem canônica);
- `"fire,banana,fire"` → `["fire"]` (lixo e duplicata fora);
- `""`, `undefined`, `"banana"`, `",,,"` → `[]`;
- `" FIRE , Water "` → normalizado;
- param repetido (`["fire", "water"]` vindo do Next) continua caindo em `firstValue`.

`lib/url.test.ts`:

- `buildQuery(current, { type: ["fire","water"] })` → `type=fire%2Cwater`;
- `{ type: [] }` remove a chave;
- mexer em `type` continua zerando `page`.

### Casos a cobrir (component)

`components/search/TypeFilter.test.tsx` (reescrito):

- trigger fechado mostra "Todos os tipos"; com `?type=fire` mostra "fire"; com `?type=fire,water`
  mostra "2 tipos";
- abrir o popover renderiza uma checkbox por tipo, com as da URL já marcadas;
- marcar duas caixas **não** navega enquanto o popover está aberto (asserção explícita de que
  `navigate` não foi chamado) — é a decisão de design que evita o round-trip por clique;
- fechar com o conjunto alterado navega uma única vez, com `type=fire,water`, preservando `q` e
  removendo `page`;
- fechar sem alterar nada não navega;
- desmarcar tudo e fechar navega para a URL sem `type`;
- "Limpar tipos" desmarca todas as caixas;
- URL mudando por fora (voltar do navegador) re-sincroniza as caixas;
- teclado: Esc fecha e devolve o foco ao trigger; Tab percorre as checkboxes na ordem do DOM.

`app/actions.test.ts`: `loadPokemonPage` com `types: ["fire","water"]` devolve a mesma fatia que a
renderização no servidor para a mesma URL (o pipeline único da story 06 continua único).

`components/pokemon/InfiniteList.test.tsx`: `filters.types` chega ao server action e ao cursor da
URL.

### Casos a cobrir (e2e)

`e2e/locators.ts` — `typeFilter(page)` deixa de ser `getByLabel` de `<select>` e passa a apontar
o trigger por papel (`getByRole("button", { name: "Filtrar por tipo" })`); adicionar
`typeOption(page, name)` para as checkboxes. Locators continuam por papel/rótulo, nunca por classe
ou `data-testid`.

`e2e/filtros.spec.ts`:

- um tipo: mantém o teste da story 06 (todo card visível carrega o badge), adaptado ao novo
  controle — garante que a mudança de UI não regrediu o filtro simples;
- dois tipos: URL vira `/?type=fire,water`, o total anunciado bate com a contagem de cards, e
  **todo card visível tem o badge fire ou o badge water** (a asserção que prova OR — contagem
  crua passaria verde num filtro errado);
- o total de fire+water é **maior** que o de fire sozinho (prova de que marcar mais amplia);
- combinação com busca: `?q=char&type=fire,water` mostra a interseção certa;
- combinação impossível (`?q=pika&type=water,rock`) cai no estado vazio com "Limpar filtros",
  que restaura a lista completa;
- URL colada com `?type=water,fire` renderiza o estado certo e as caixas certas marcadas;
- scroll infinito com dois tipos marcados: carregar mais mantém o filtro (não vaza item de outro
  tipo na fatia 2).

`e2e/a11y.spec.ts`:

- axe limpo com o popover **aberto** (estado novo, não coberto hoje);
- trigger alcançável por Tab e com contorno de foco visível (`focusRingWidth` ≠ `0px`);
- Esc fecha o popover e o foco volta ao trigger.

`e2e/loading-filtros.spec.ts`: o `PendingIndicator` aparece ao fechar o popover com mudança, e não
aparece ao fechar sem mudança.

### Verificação manual (`pnpm dev`)

- Abrir `/`, abrir o dropdown: duas colunas de checkboxes, todos os tipos visíveis sem scroll
  interno em altura de laptop.
- Marcar 3 tipos, fechar: uma navegação só, trigger diz "3 tipos", lista amplia.
- Em 375px: popover não estoura a viewport, cai para uma coluna, trigger ocupa a largura toda.
- Dark mode: popover, checkboxes e o estado marcado legíveis nos dois temas (os tokens do shadcn
  precisam bater com o zinc atual).
- Voltar do navegador restaura as caixas marcadas.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint`, `pnpm typecheck` e `pnpm build` limpos. Nenhum teste
> existente removido só por ter ficado inconveniente: os testes da story 06 são adaptados ao novo
> controle, não deletados. Sem `skip`/`only` sem justificativa no código.

## Fora de escopo

- Toggle AND/OR na interface — OR é fixo.
- Busca/filtro dentro do dropdown de tipos (são ~20 tipos, cabem na tela).
- Chips de tipo ativo fora do dropdown — o rótulo do trigger + "Limpar filtros" bastam.
- Ícones ou cores por tipo nas checkboxes.
- Migrar o resto da UI (`SearchInput`, cards, `EmptyState`, `Skeleton`) para shadcn — só
  `popover` e `checkbox` entram.
- Trocar o tema/tokens do projeto pelos do shadcn.
- Filtro por geração, stats ou ordenação.
