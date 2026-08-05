# Plan: "Limpar filtros" duplicado ganha nome acessível distinto

## Context

Bug encontrado pelos testes da [17-testes-e2e](./done/17-testes-e2e.md), anotado dentro do
`e2e/filtros.spec.ts` e não consertado (aquela story só escrevia teste).

Quando um filtro não devolve resultado, dois links com o **mesmo nome acessível** e o **mesmo
`href`** convivem na tela:

- `components/search/ClearFiltersLink.tsx` — na barra de filtros, só aparece com filtro ativo;
- `app/page.tsx:99` — o `emptyAction` passado ao `InfiniteList`, dentro do `EmptyState`.

O axe não reclama (não é violação de WCAG: nomes duplicados são permitidos), mas o resultado é
ruim para quem navega por lista de links do leitor de tela — dois "Limpar filtros" seguidos, sem
nada distinguindo qual é qual nem de onde vieram. E, no teste, obriga um `.first()` que só existe
para desempatar: o spec deixa de afirmar _qual_ link foi clicado, que é justamente o que ele
deveria estar provando.

### Decisão travada: nomes distintos, texto visível preservado

Cada link ganha um nome acessível próprio, **contendo o texto visível** — exigência do critério
2.5.3 (Label in Name), para quem usa comando de voz ("clicar em limpar filtros") continuar
acertando:

- barra de filtros: continua **"Limpar filtros"** — é o controle canônico, ao lado dos outros;
- estado vazio: **"Limpar filtros e ver a lista completa"**, via `aria-label`. O texto visível
  segue sendo "Limpar filtros" (a pílula não muda de tamanho), e o nome acessível diz para onde a
  ação leva — que é a informação que falta quando o link é lido fora de contexto.

Alternativas descartadas:

- **Esconder o link da barra quando o estado vazio aparece.** Os dois vivem em subárvores de
  Suspense diferentes (`FilterBar` e `ResultsArea`); a barra não sabe quantos resultados a lista
  tem, e fazê-la saber significa levantar esse estado para um contexto novo — muita máquina para
  um problema de rótulo. Além disso o link da barra é o que o usuário já aprendeu a procurar.
- **Mudar o texto visível de um dos dois.** Resolveria, ao custo de dois rótulos diferentes para a
  mesma ação na mesma tela — troca um problema por outro.
- **`aria-labelledby` apontando para o título do estado vazio.** Nome acessível deixaria de conter
  o texto visível, quebrando 2.5.3.

### Relação com a story 19

A [19-limpar-filtros-com-loading](./19-limpar-filtros-com-loading.md) unifica os dois pontos num
`ClearFiltersAction` compartilhado. As duas stories são independentes e podem entrar em qualquer
ordem:

- se a **19 entrar antes**, o nome acessível vira uma prop do componente compartilhado, e esta
  story fica menor;
- se **esta entrar antes**, a 19 herda os dois rótulos ao extrair o componente e passa a carregá-los
  como prop.

O que **não** pode acontecer é a 19 unificar os dois e, no caminho, colapsar os rótulos de volta em
um só — o teste desta story é o que impede isso.

## Desenho

### `app/page.tsx`

O `<Link>` do `emptyAction` ganha `aria-label="Limpar filtros e ver a lista completa"`. Texto
visível, `href` e classes inalterados. Comentário curto amarrando o `aria-label` à razão (dois
links com o mesmo destino na mesma tela), senão some no próximo refactor.

### `components/search/ClearFiltersLink.tsx`

Sem mudança. Ele é o rótulo canônico; documentar no JSDoc existente que o par do estado vazio usa
nome estendido de propósito.

### `e2e/filtros.spec.ts`

O `.first()` sai. O teste passa a clicar no link **do estado vazio**, pelo nome completo — a
asserção volta a dizer qual link foi exercitado. O comentário que hoje explica o desempate é
substituído pela afirmação de que os dois nomes são distintos.

### `e2e/a11y.spec.ts`

Ganha o caso novo: numa listagem sem resultado, os links de limpar filtros têm nomes acessíveis
**distintos**. É a asserção que trava a regressão — o axe não a faz sozinho.

## Validação

### Comandos

```
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
```

### Casos a cobrir (component)

`components/ui/EmptyState.test.tsx` / `components/pokemon/PokemonGrid.test.tsx` /
`VirtualGrid.test.tsx`: os testes existentes que renderizam um `emptyAction` continuam verdes — o
`emptyAction` é passado por quem chama, então a mudança de `app/page.tsx` não pode exigir ajuste
neles. Se exigir, o acoplamento está no lugar errado.

`components/search/ClearFiltersLink.test.tsx` (novo — a story 16 não cobriu este componente):

- sem `q` nem `type` na URL, não renderiza nada;
- com `?q=char`, renderiza um link com nome acessível exatamente **"Limpar filtros"** e `href="/"`;
- com `?type=fire`, idem.

### Casos a cobrir (e2e)

`e2e/filtros.spec.ts`:

- combinação impossível cai no estado vazio; clicar em **"Limpar filtros e ver a lista completa"**
  (o do estado vazio, sem `.first()`) leva a `/` com a lista completa;
- clicar em **"Limpar filtros"** (o da barra, `getByRole("link", { name: "Limpar filtros",
exact: true })`) leva ao mesmo lugar — os dois funcionam, o teste é que passa a distinguir.

`e2e/a11y.spec.ts`:

- em `/?q=zzzz`, os nomes acessíveis dos links que levam a `/` são **dois valores distintos**;
- axe continua sem violação serious/critical nessa rota (regressão da story 09/17).

### Verificação manual

`pnpm dev` → `/?q=zzzz&type=water`:

- leitor de tela (NVDA/VoiceOver) na lista de links: os dois aparecem com rótulos diferentes e o do
  estado vazio diz para onde leva;
- visualmente nada muda: os dois continuam escritos "Limpar filtros", com os estilos de hoje
  (link sublinhado na barra, pílula escura no estado vazio);
- comando de voz "clicar em limpar filtros" ainda alcança os dois (o texto visível é prefixo do
  nome acessível estendido).

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Nenhum `.first()` novo em locator
> de link nos specs tocados. Sem `skip`/`only` sem justificativa no código.

## Fora de escopo

- **Loading e reset otimista ao limpar** — [19](./19-limpar-filtros-com-loading.md).
- Extrair o componente compartilhado dos dois links — também é da 19.
- Esconder um dos dois links conforme o estado da lista.
- Limpar seletivamente (só `q` ou só `type`).
- Revisar nomes acessíveis duplicados em outros pontos da UI — não há outro caso conhecido; se
  aparecer, entra com o caso.
- Mudar o texto visível de qualquer um dos dois.
