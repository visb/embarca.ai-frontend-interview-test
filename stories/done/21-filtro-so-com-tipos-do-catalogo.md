# Plan: Filtro só oferece tipos que existem no catálogo

## Context

Bug encontrado pelos testes da [17-testes-e2e](./done/17-testes-e2e.md) — a fixture do mock server
reproduz de propósito o contrato real do `GET /type`, e foi isso que expôs o problema.

`getTypes` (`lib/api/pokemon.ts:66`) remove uma lista fixa de tipos não-batalha:

```ts
const NON_BATTLE_TYPES = new Set(["unknown", "shadow"]);
```

`stellar` — tipo da geração 9 — não está nessa lista, passa pelo filtro e vira uma `<option>` do
`<select>`. Nenhum dos 100 primeiros pokémons tem esse tipo, então selecioná-lo leva sempre ao
estado vazio. É uma opção morta na UI: o usuário escolhe um filtro legítimo da lista e recebe
"nenhum resultado", sem nada indicando que aquela combinação era impossível desde o começo.

### Decisão travada: derivar do catálogo, não estender a lista fixa

Acrescentar `"stellar"` ao `NON_BATTLE_TYPES` conserta o sintoma de hoje e deixa a armadilha
armada: a PokeAPI ganha tipos ao longo das gerações, e o recorte deste app são os **100 primeiros**
pokémons (geração 1). Toda geração nova reabre o mesmo bug, e o descobrimento seria de novo por
acaso.

A regra correta é a que já está escrita no comentário do próprio código — "tipos que não pertencem
a nenhum pokémon da lista" — só que aplicada de fato: `getTypes` passa a devolver apenas os tipos
**presentes no catálogo**. `unknown`, `shadow` e `stellar` caem juntos, pela mesma razão, sem
nenhum nome hardcoded.

Consequência: `getTypes` passa a depender de `getPokemonCatalog`. Sem custo de rede — as duas são
`"use cache"` com `cacheLife("max")` e o catálogo já é buscado no mesmo render de `app/page.tsx`.
O que muda é acoplamento: `getTypes` deixa de ser "o que a API expõe" e vira "o que este catálogo
usa". É o significado que o filtro sempre quis.

### Efeito colateral desejado em `?type=stellar`

`app/page.tsx:78` valida o param contra a lista devolvida por `getTypes`. Com a lista estreitada,
`?type=stellar` colado na URL passa a ser tratado como tipo desconhecido: **não filtra**, mostra a
lista completa — mesmo contrato que `?type=banana` tem hoje. Antes, mostrava o estado vazio. A
mudança é intencional e precisa de teste, porque é comportamento visível.

### Junto: o JSDoc de `filterByType` está mentindo

Achado da [16-testes-unitarios](./done/16-testes-unitarios.md), anotado lá e não consertado.
`lib/filters.ts:14` afirma:

> Tipo vazio ou desconhecido devolve a lista intacta — `?type=banana` e ignorado, nao vira erro.

Só o tipo **vazio** devolve a lista intacta. `filterByType(items, "banana")` devolve `[]`. Não há
bug visível hoje porque `parseTypeParam` neutraliza o desconhecido antes de chegar aqui — mas
qualquer chamador novo que confie no comentário esvazia a lista sem perceber. Entra nesta story por
ser o mesmo assunto (tipo que não existe no catálogo) e uma correção de duas linhas; abrir story
para um comentário errado seria cerimônia maior que o conserto.

O comentário é corrigido para descrever o comportamento real e apontar onde a garantia de verdade
mora (`parseTypeParam`). **A função não muda** — mudar o comportamento dela para "desconhecido
devolve tudo" tornaria o filtro incapaz de expressar "nenhum resultado", e o teste da story 16 que
fixa o comportamento atual continua valendo.

## Desenho

### `lib/api/pokemon.ts`

- `NON_BATTLE_TYPES` some.
- `getTypes` (continua `"use cache"` + `cacheLife("max")`) passa a:
  - buscar `GET /type` e o catálogo (`getPokemonCatalog()`) em paralelo;
  - montar o `Set` dos tipos presentes no catálogo (`catalog.flatMap(p => p.types)`);
  - filtrar os resultados da API por esse `Set`, **preservando a ordem da API** — é ela que dá a
    ordem canônica das `<option>`, e ordenar por outra coisa mudaria a UI sem pedido;
  - JSDoc explicando a razão do acoplamento com o catálogo (o recorte de 100 é que define o que faz
    sentido oferecer) e que o custo de rede é zero pelo cache.

Nada muda em `FilterBar`, `TypeFilter`, `app/page.tsx` ou na assinatura de `getTypes` — só o
conteúdo da lista.

### `lib/filters.ts`

Só o JSDoc de `filterByType`. Zero mudança de comportamento.

### `e2e/mock-api/fixtures.ts`

A fixture do `/type` precisa continuar devolvendo **pelo menos um tipo ausente do catálogo** —
`stellar` é o caso real e deve ficar. Sem isso, o teste que prova esta story não teria o que
provar, e o mock deixaria de refletir o contrato da API de verdade (que foi o ponto da story 17).

## Validação

### Comandos

```
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
```

`PW_LIVE=1 pnpm test:e2e --project=chromium` também: se a lista de tipos da PokeAPI real divergir
do que a fixture assume, é aqui que aparece.

### Casos a cobrir (unit)

`lib/api/pokemon.test.ts`, com `pokeApiFetch` mockado:

- catálogo com tipos `{grass, poison, fire, electric}` + `/type` devolvendo esses mais
  `stellar`/`unknown`/`shadow` → `getTypes` devolve **só os quatro**;
- a ordem devolvida é a da resposta da API, não alfabética nem a do catálogo;
- tipo presente em um único pokémon do catálogo **é mantido** (a regra é "existe", não "é comum");
- `/type` devolvendo um tipo que o catálogo tem mas com caixa diferente não some por causa disso
  (os mappers já normalizam — o teste trava a normalização no lugar certo);
- catálogo vazio → lista vazia, sem estourar.

`lib/filters.test.ts`: sem caso novo. O comentário mudou, o comportamento não — os testes da story
16 continuam verdes como estão, e isso é a prova de que a correção foi de documentação.

### Casos a cobrir (e2e)

`e2e/filtros.spec.ts`:

- o `<select>` **não** oferece a opção `stellar` (asserção por `getByRole("option")`, pelo nome) —
  e continua oferecendo os tipos reais da geração 1 (`fire`, `water`, `grass`, `electric`);
- toda opção do `<select>`, quando selecionada, produz **pelo menos um card** — a asserção que
  generaliza a story: nenhuma opção do filtro leva ao estado vazio sozinha. Esse é o teste que
  pega a próxima geração antes do usuário;
- `?type=stellar` colado na URL renderiza a **lista completa** (tipo desconhecido não filtra), com
  o `<select>` em "Todos os tipos" — não o estado vazio.

### Verificação manual (`pnpm dev`)

- Abrir `/`, abrir o `<select>`: `stellar`, `unknown` e `shadow` ausentes; os 15 tipos da geração 1
  presentes.
- Escolher cada opção uma vez: nenhuma cai em "Nenhum pokemon encontrado".
- Colar `/?type=stellar`: lista completa.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- **Aumentar o `CATALOG_SIZE`** — continua 100. Se crescer, a lista de tipos se ajusta sozinha, que
  é justamente o ponto desta story.
- Filtro múltiplo de tipos — [18](./18-filtro-multiplo-de-tipos.md). Se ela entrar antes, esta
  continua valendo sem alteração: a lista estreitada alimenta as checkboxes do mesmo jeito.
- Mostrar contagem por tipo na opção ("fire (12)") — informação útil, pedido inexistente.
- Ícone ou cor por tipo no `<select>`.
- Mudar o comportamento de `filterByType` para tipo desconhecido (segue devolvendo `[]`; só o
  comentário é corrigido).
- Trocar `GET /type` por uma lista derivada só do catálogo, sem chamar a API: a ordem canônica das
  opções vem da API e não deve ser inventada localmente.
