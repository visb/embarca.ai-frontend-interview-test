# Plan: "Limpar filtros" com o mesmo feedback de selecionar um filtro

## Context

Selecionar um tipo ou digitar na busca passa pelo `FilterTransitionProvider`
(`components/search/FilterTransition.tsx`): o `router.replace` roda dentro de um
`useTransition`, então o `PendingIndicator` do `TypeFilter` gira e o `ResultsArea` esmaece a
grade (`aria-busy`) até o Server Component responder. Além disso os controles espelham o valor
escolhido em estado local, então a UI reflete a escolha **antes** da URL commitar.

O "Limpar filtros" ficou de fora dessa mecânica. Ele é um `<Link href="/">` puro, em dois
lugares:

- `components/search/ClearFiltersLink.tsx` — na barra de filtros;
- `app/page.tsx:99` — o `emptyAction` passado ao `InfiniteList` (estado vazio).

Consequências que o usuário reportou:

1. **Sem loading.** A navegação do `<Link>` não passa pelo contexto, então nada indica que a
   lista está sendo recarregada — a tela parece travada até a nova árvore chegar.
2. **Filtros não limpam na hora.** `SearchInput.term` e `TypeFilter.selected` só sincronizam
   quando `useSearchParams()` muda, e o App Router segura a URL antiga durante a transição. O
   input continua com o termo e o `<select>` com o tipo durante toda a espera.

O alvo é paridade: clicar em limpar = selecionar um filtro. Controles zeram imediatamente,
spinner liga, grade esmaece.

### Decisões travadas

- **`replace`, não `push`** (decisão do usuário). Limpar passa a usar o mesmo `navigate()` do
  contexto, que é `router.replace(href, { scroll: false })`. Trade-off aceito: voltar no
  navegador não retorna à lista filtrada — sai da listagem. O ganho é consistência: os três
  controles mexem na mesma URL pelo mesmo caminho, e o histórico não guarda estados
  intermediários de filtro.
- **Continua sendo `<a>`, não `<button>`.** Mantém `<Link href="/">` e intercepta só o clique
  simples com `preventDefault()`. Ctrl/Cmd/Shift/middle-click seguem abrindo em nova aba, e o
  href real preserva o menu de contexto e o "copiar endereço". Virar `<button>` jogaria isso fora
  por nada.
- **Um componente para os dois lugares.** A barra e o estado vazio precisam do mesmo
  comportamento; duas cópias divergem na próxima mexida.
- **O reset otimista mora no contexto.** Os controles não conversam entre si; o `FilterTransition`
  já é o ponto comum a todos e está acima dos dois blocos em `app/page.tsx`.

## Desenho

### `components/search/FilterTransition.tsx`

Contexto ganha dois membros:

- `clearToken: number` — contador que incrementa a cada limpeza. É o sinal de "descarte seu
  espelho local", não o valor em si: os controles reagem à _mudança_ do token.
- `clearFilters(): void` — incrementa o token e chama o `navigate("/")` que já existe. Como o
  `navigate` roda dentro do `startTransition`, o `pending` liga no mesmo tick — spinner e fade
  vêm de graça, sem código novo em `TypeFilter` nem em `ResultsArea`.

### `components/search/ClearFiltersAction.tsx` (novo)

Client component único, usado nos dois pontos:

- `<Link href="/">` com o texto "Limpar filtros" e `className` recebido por prop (a barra usa
  link sublinhado, o estado vazio usa pílula escura — só a aparência difere).
- `onClick`: se `event.defaultPrevented` ou houver modificador (`metaKey`, `ctrlKey`, `shiftKey`,
  `altKey`) ou não for botão primário, **não** intercepta — deixa o navegador abrir em nova aba.
  Caso contrário, `preventDefault()` + `clearFilters()`.
- Prop opcional para o caso "só aparece quando há filtro" (uso da barra) vs "sempre visível"
  (estado vazio, que por definição já está filtrado).

### `components/search/ClearFiltersLink.tsx`

Vira casca fina sobre o `ClearFiltersAction` com o estilo da barra. Mantém a regra de só
renderizar com filtro ativo, mas a condição passa a considerar a limpeza otimista: assim que o
token muda, some — não espera a URL commitar, senão fica um "Limpar filtros" clicável sobre uma
lista que já está sendo limpa.

### `app/page.tsx`

O `emptyAction` deixa de montar o `<Link>` inline e passa a usar `ClearFiltersAction` com o
estilo pílula. Continua sendo renderizado dentro do `FilterTransitionProvider` (via
`ResultsArea` → `InfiniteList`), então o contexto vale.

### `components/search/SearchInput.tsx`

Acompanha o `clearToken` num state espelho e, quando ele muda, **durante o render** (mesmo padrão
já usado no `TypeFilter`, para não pintar um frame com o valor velho):

- zera `term`;
- cancela o timeout de debounce em voo e baixa o `isTypingRef` — sem isso um debounce disparado
  logo antes do clique navegaria de volta com o termo antigo, desfazendo a limpeza.

### `components/search/TypeFilter.tsx`

Mesmo tratamento: token mudou → `selected = ""`. Precisa conviver com o ajuste
`syncedType !== urlType` que já existe; o reset não pode ser desfeito quando a URL commitar em
`/` (aí `urlType` vira `""`, que é o mesmo valor — inofensivo).

### Arquivos tocados

| Arquivo                                    | Mudança                                 |
| ------------------------------------------ | --------------------------------------- |
| `components/search/FilterTransition.tsx`   | `clearToken` + `clearFilters()`         |
| `components/search/ClearFiltersAction.tsx` | novo — link interceptado, reaproveitado |
| `components/search/ClearFiltersLink.tsx`   | casca + esconder otimista               |
| `components/search/SearchInput.tsx`        | reset por token + cancelar debounce     |
| `components/search/TypeFilter.tsx`         | reset por token                         |
| `app/page.tsx`                             | `emptyAction` usa o componente novo     |
| testes correspondentes                     | ver Validação                           |

## Validação

### Comandos

```
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
```

### Casos a cobrir (unit/component, Vitest + Testing Library)

`FilterTransition`:

- `clearFilters()` chama `router.replace("/", { scroll: false })` e deixa `pending` verdadeiro
  enquanto a transição não resolve;
- `clearToken` incrementa a cada chamada (duas limpezas seguidas = dois valores distintos).

`ClearFiltersAction`:

- clique simples: `preventDefault` chamado e `clearFilters` disparado — a navegação sai pelo
  contexto, não pelo `<Link>`;
- clique com `metaKey`/`ctrlKey` (e botão do meio): **não** intercepta, `clearFilters` não é
  chamado — o `href="/"` continua funcionando para abrir em nova aba;
- renderiza um `<a>` com `href="/"` e nome acessível "Limpar filtros" nos dois estilos.

`SearchInput`:

- com `?q=char` na URL, limpar zera o input **antes** de a URL mudar (searchParams ainda com o
  termo antigo);
- digitar e limpar dentro da janela de debounce: o debounce não navega depois — a URL final é
  `/`, não `/?q=<termo>`.

`TypeFilter`:

- com `?type=fire`, limpar volta o `<select>` para "Todos os tipos" antes do commit da URL;
- o spinner (`PendingIndicator`) aparece durante a limpeza, igual à seleção de um tipo.

`ClearFiltersLink`:

- sem `q` nem `type` na URL não renderiza nada (regressão do comportamento atual);
- some imediatamente após o clique, sem esperar a URL commitar.

`ResultsArea`:

- `aria-busy="true"` durante a limpeza (o mesmo caminho já coberto para busca/filtro, agora
  disparado por `clearFilters`).

`app/page.tsx` / estado vazio:

- o `emptyAction` renderizado pelo `InfiniteList` continua sendo um link acessível "Limpar
  filtros" apontando para `/` (os testes existentes em `InfiniteList.test.tsx`,
  `VirtualGrid.test.tsx`, `PokemonGrid.test.tsx` e `EmptyState.test.tsx` não podem quebrar).

### e2e (Playwright, `e2e/filtros.spec.ts`)

Estender "combinacao impossivel cai no estado vazio, e limpar restaura a lista":

- após o clique em "Limpar filtros", o input de busca e o `<select>` de tipo já estão vazios
  **enquanto** a lista recarrega;
- o container de resultados expõe `aria-busy="true"` durante a espera e volta a `false` no fim;
- a lista completa reaparece e a URL é `/`.

### Verificação manual

`pnpm dev` → abrir `/?q=char&type=fire` com throttling de rede (Slow 3G no DevTools) e clicar em
"Limpar filtros" nos dois lugares (barra e estado vazio, este via um filtro sem resultado):

- input e `<select>` zeram no instante do clique;
- spinner ao lado do `<select>` liga e a grade esmaece;
- a lista completa entra e o botão "Limpar filtros" some;
- Ctrl/Cmd+clique no link abre `/` em nova aba, sem limpar a aba atual;
- responsivo: no mobile (barra empilhada) o botão continua alcançável e o spinner não empurra o
  layout.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Filtro múltiplo de tipos (story 18) — se ela entrar antes, o reset por token vale igual, mas o
  desenho aqui assume o `<select>` simples atual.
- Mexer no valor do debounce (300 ms) ou na estratégia `replace` dos outros controles.
- Reset de scroll ao limpar: `navigate` mantém `{ scroll: false }`, mesmo comportamento de hoje.
- Preservar o filtro no histórico (decisão explícita de usar `replace`).
- Limpar seletivamente (só `q` ou só `type`) — o botão continua zerando tudo.
