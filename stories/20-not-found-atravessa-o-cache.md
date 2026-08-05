# Plan: `/pokemon/<inexistente>` mostrar a página "não encontrado"

## Context

Bug encontrado pelos testes da [17-testes-e2e](./done/17-testes-e2e.md), registrado lá como achado
e não consertado (aquela story só escrevia teste). A asserção já existe em `e2e/detalhes.spec.ts`,
marcada `test.fixme` — esta story a destrava.

### O que acontece

`app/pokemon/[name]/page.tsx:93` tem o tratamento correto no papel:

```ts
async function fetchPokemonOr404(name: string) {
  try {
    return await getPokemonByName(name);
  } catch (error) {
    if (error instanceof PokeApiError && error.isNotFound) notFound();
    throw error;
  }
}
```

Só que `getPokemonByName` (`lib/api/pokemon.ts:54`) é `"use cache"`. O `PokeApiError` lançado lá
dentro **atravessa a fronteira do cache** e chega do outro lado sem a identidade de classe: o
`instanceof PokeApiError` dá falso, o `notFound()` nunca roda e o erro sobe para
`app/pokemon/[name]/error.tsx`. O usuário vê a UI de erro genérica ("algo deu errado, tentar
novamente") em vez do `not-found.tsx`, que existe, está pronto e nunca é exibido.

Isso é **diferente** da limitação já documentada no README, que é sobre o _status_ ser 200 em vez
de 404 (`dynamicParams` incompatível com Cache Components). Aquela continua valendo e continua
fora de escopo. Aqui o alvo é a **página errada**, não o status errado.

### Decisão travada: 404 vira valor de retorno, não exceção

`getPokemonByName` passa a devolver `PokemonDetail | null` — `null` para 404 — e a rota decide pelo
valor. Nada de `PokeApiError` de 404 atravessando a fronteira do cache.

Escolha do usuário entre reidratar o erro pelo shape (`status === 404` num objeto serializado) e
esta. Por quê esta:

- **Não depende do que o Next preserva na serialização.** Reconhecer erro por shape funciona até a
  próxima versão mudar o que sobrevive à fronteira, e falha em silêncio — voltando exatamente ao
  bug de hoje, com um teste que só pega no e2e.
- **404 não é excepcional aqui.** "Esse nome não existe" é uma resposta prevista do domínio, não
  uma falha. `null` é o tipo honesto, e o `strictNullChecks` obriga todo call site a tratar — é o
  compilador cobrando o que hoje depende de um `instanceof` que mente.

Erros **não-404** continuam sendo lançados e continuam subindo para o `error.tsx`. Eles não
precisam de identidade preservada: qualquer falha ali resulta na mesma UI de erro. É só o 404 que
exige distinguir.

Custo aceito: a assinatura pública de `getPokemonByName` muda, e com ela os testes da
[16-testes-unitarios](./done/16-testes-unitarios.md) que hoje afirmam "nome inexistente → erro 404
tipado".

## Desenho

### `lib/api/pokemon.ts`

- `getPokemonByName(name): Promise<PokemonDetail | null>`.
- Dentro do `"use cache"`: `try { … } catch (error) { if (error instanceof PokeApiError &&
error.isNotFound) return null; throw error; }` — o `instanceof` roda **do lado de dentro**, onde a
  identidade da classe é confiável.
- JSDoc reescrito: hoje ele diz "erros 404 sobem como `PokeApiError` … para a rota decidir entre
  `notFound()` e a UI de erro". Vira a descrição do contrato novo, com a razão (`use cache`)
  registrada — senão o próximo refactor "simplifica" de volta para o throw.

> `null` é cacheado como qualquer outro valor. É o desejado: nome inexistente não vira uma
> requisição à PokeAPI por acesso.

### `app/pokemon/[name]/page.tsx`

- `fetchPokemonOr404` some. A página fica:
  `const pokemon = await getPokemonByName(name); if (!pokemon) notFound();`
- O comentário de linha 51–56 é atualizado: a parte sobre o `notFound()` não rodar deixa de ser
  verdade; a parte sobre o status 200 (`cacheComponents` + `dynamicParams`) permanece.
- `generateMetadata` troca o `try/catch` por checagem de `null` (o `catch` continua desnecessário
  para 404; erro real segue derrubando a metadata como hoje, com o mesmo fallback neutro).
- O import de `PokeApiError` sai do arquivo.

### `app/actions.ts`

Verificar se `loadPokemonPage` ou qualquer outro call site consome `getPokemonByName` — se
consumir, tratar o `null`. O `pnpm typecheck` é o que garante que nenhum ficou para trás.

### Testes ajustados

- `lib/api/pokemon.test.ts` — o caso "nome inexistente → erro 404 tipado" vira "nome inexistente →
  `null`"; **adicionar** o caso que hoje não existe: erro 500 continua sendo lançado (a distinção
  entre "não existe" e "a API caiu" é exatamente a regra desta story, e sem esse par o `null`
  poderia engolir tudo).
- `e2e/detalhes.spec.ts` — remover o `test.fixme` e o bloco de comentário que o justifica.
- `e2e/erros/detalhe.spec.ts` — confirmar que `MOCK_MODE=fail-detail` (500) continua caindo na UI
  de erro com retry. É o teste que impede o conserto de virar "todo erro vira not-found".

### `README.md`

A limitação da linha 215 é **reescrita**, não removida: o status 200 continua; a página errada não.
Some a frase "o teste correspondente está … marcado como pendente".

## Validação

### Comandos

```
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
```

`pnpm typecheck` é o comando que carrega peso aqui: a troca para `| null` é o que aponta os call
sites esquecidos.

### Casos a cobrir (unit)

`lib/api/pokemon.test.ts`, com `pokeApiFetch` mockado:

- 404 → `getPokemonByName` devolve `null`, sem lançar;
- 500 → **lança** `PokeApiError` com `status: 500` (não vira `null`);
- falha de rede (`status: 0`) → lança;
- sucesso → devolve o `PokemonDetail` mapeado, igual a hoje (não regride a story 16).

### Casos a cobrir (e2e)

`e2e/detalhes.spec.ts` (o `fixme` destravado):

- `/pokemon/<nome-que-nao-existe>` mostra o heading "Pokemon nao encontrado" e o link "Voltar para
  a listagem", **e não** a UI de erro com "Tentar novamente";
- o link de voltar leva à listagem.

`e2e/erros/detalhe.spec.ts`, sem alteração de intenção:

- `MOCK_MODE=fail-detail`: a rota do nome que falha continua mostrando a UI de erro **com retry** —
  a prova de que 500 não foi silenciado junto com o 404.

### Verificação manual (`pnpm dev`)

- `/pokemon/mewtwo` (existe na PokeAPI, fora do recorte de 100): renderiza o detalhe normalmente —
  o conserto não pode transformar "fora do prerender" em "não encontrado".
- `/pokemon/xyz123`: página "Pokemon nao encontrado", com o botão de voltar.
- Recarregar `/pokemon/xyz123`: mesma página, sem flash da UI de erro.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. O `test.fixme` de
> `e2e/detalhes.spec.ts` sai destravado e verde, não removido. Sem `skip`/`only` sem justificativa
> no código.

## Fora de escopo

- **Fazer a rota responder HTTP 404 de verdade.** Continua 200, pela incompatibilidade entre
  `dynamicParams` e Cache Components documentada no README. Se algum dia for atacado, é story
  própria — mexe em prerender e em `generateStaticParams`.
- Mudar `app/pokemon/[name]/error.tsx` ou `not-found.tsx` — os dois já existem e servem.
- Revisar a serialização de erro através de `"use cache"` em geral, ou criar um utilitário de
  reidratação de erro. Só o 404 precisa da distinção; generalizar aqui seria abstração sem segundo
  caso.
- `getPokemonCatalog` — o 404 não faz sentido para o índice; falha lá continua sendo erro.
