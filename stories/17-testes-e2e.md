# Plan: Testes e2e (Playwright)

## Context

Segunda metade da dívida de teste. A [16-testes-unitarios](./16-testes-unitarios.md) cobre função
pura, camada de I/O mockada e componente síncrono; sobra o que só o e2e alcança: os **Server
Components assíncronos**, que são o caminho principal deste app e que os docs do Next dizem
explicitamente para cobrir por e2e (foi essa a razão de o Playwright existir aqui, ver
[01-infra-de-testes](./done/01-infra-de-testes.md)).

Hoje `e2e/` tem só o smoke da infra. As stories 03–14 planejaram oito arquivos de spec que nunca
foram escritos.

### Problema descoberto no levantamento: `page.route` não mocka a PokeAPI

As stories 03, 07 e 12 planejaram os casos de erro com `page.route` interceptando a PokeAPI. **Isso
não funciona neste app.** Todo I/O com a PokeAPI é server-side — Server Component no build/render e
a server action `loadPokemonPage`. `page.route` intercepta requisição originada no **browser**, e a
requisição para `pokeapi.co` nunca sai do browser. Um teste escrito assim passaria por nunca
interceptar nada, que é pior que não existir.

(`page.route` **continua** válido para o POST da server action, que é browser → servidor Next. É
com ele que os casos de lentidão e falha das stories 13 e 14 são feitos.)

### Decisão travada: base URL por env + mock server de fixtures

Escolha do usuário entre três saídas. `lib/api/http.ts` troca a const por
`process.env.POKEAPI_BASE_URL ?? "https://pokeapi.co/api/v2"`, e o Playwright sobe um servidor de
fixtures local, apontando o app para ele.

Por quê:

- **Determinismo.** Hoje o `pnpm build` faz 1 + 100 requisições à PokeAPI; o README já avisa que
  build falha se a API estiver instável. A suíte e2e herdaria essa flakiness inteira.
- **É o único jeito de provar o caminho de erro.** 500, 404 e queda de rede da PokeAPI são
  requisitos explícitos do README e não têm como ser encenados de fora do processo do Next.
- **Roda offline** e em CI sem depender de terceiro.

Custo aceito: uma linha de código de produção passa a ler env. É menos invasivo que MSW num
`instrumentation.ts` (dep nova + código só-de-teste dentro do runtime) e mais honesto que fingir
que o erro está coberto.

### Decisão travada: caminho de erro é **projeto separado**, não `test.step`

O catálogo é cacheado com `'use cache'` + `cacheLife('max')`. Depois do primeiro sucesso, derrubar
o mock não produz erro nenhum — o cache responde. Então o erro não pode ser um teste no meio da
suíte feliz: é um **segundo projeto** do Playwright, com o próprio `webServer`, subindo o mock em
modo de falha desde antes do build. É a diferença entre testar o erro e testar o cache.

### Decisão travada: mesmas quatro regras de intenção da story 16

Query por role/label (nunca CSS ou `data-testid`), nome do teste = garantia, zero snapshot. No e2e
isso significa: **asserção sobre o que o usuário vê e sobre a URL**, nunca sobre contagem de
requisição ou estado interno. E asserção de conteúdo, não de contagem crua de nós — `40 cards` só
importa acompanhado de _quais_.

## Desenho

### Mock server

`e2e/mock-api/` — servidor `node:http` sem dependência nova:

- `fixtures.ts` — gera as respostas de `/pokemon?limit=100`, `/pokemon/{id|name}` e `/type`.
  **100 pokémons determinísticos** com nomes reais no começo (bulbasaur, charmander, charmeleon,
  charizard, pikachu, mr-mime) — os casos das stories 05 e 06 dependem desses nomes — e tipos
  distribuídos de forma conhecida, para o total filtrado ser uma constante conferível.
- `server.ts` — serve as fixtures. Modo controlado por env:
  - `MOCK_MODE=ok` (padrão) — tudo 200.
  - `MOCK_MODE=fail-catalog` — `/pokemon?limit=100` responde 500.
  - `MOCK_MODE=fail-detail` — o detalhe de um nome específico responde 500.
  - Nome desconhecido → 404 sempre, em qualquer modo.
- Sprites: fixture aponta para uma URL do próprio mock, servindo um PNG 1×1. Evita
  `next/image` batendo em `raw.githubusercontent.com` no meio do teste (e exige acrescentar o host
  local aos `remotePatterns` **só quando** `POKEAPI_BASE_URL` é local).

### `playwright.config.ts`

- `webServer` vira array: `[mock, app]`. O mock sobe primeiro e o app recebe
  `POKEAPI_BASE_URL=http://localhost:<mockPort>` — o build já prerenderiza contra o mock.
- Dois `projects`:
  - `chromium` — `testDir: e2e/`, `testIgnore: e2e/erros/**`.
  - `chromium-erros` — só `e2e/erros/**`, com o próprio `webServer` em `MOCK_MODE=fail-*` e outra
    porta, para não colidir com o app do projeto feliz.
- `PW_LIVE=1` mantém a opção de rodar a suíte feliz contra a PokeAPI real, sem mock — útil para
  pegar mudança de contrato da API de verdade. **Não** é o padrão nem entra no CI.

### Specs

| Arquivo                       | Prova (origem)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/listagem.spec.ts`        | Home renderiza a primeira fatia (20 cards, não 100); o primeiro card é bulbasaur com imagem de fato carregada (`naturalWidth > 0`, não só `<img>` presente); o total anunciado bate com o catálogo. ([03](./done/03-listagem-e-estados.md))                                                                                                                                                                                                                             |
| `e2e/busca.spec.ts`           | Digitar "pika" reduz a grade **e a URL vira `?q=pika`**; recarregar mantém filtro e texto no input; "zzzz" cai no estado vazio, sem erro; estar em `?page=3` e buscar volta para a primeira fatia; `?q=mr` acha `mr-mime`. ([05](./done/05-busca-por-nome.md))                                                                                                                                                                                                          |
| `e2e/filtros.spec.ts`         | Filtrar por um tipo reduz a grade e **todo card visível tem aquele badge** (a asserção que prova o filtro, não a contagem); `?q=char&type=fire` mostra só a interseção; combinação impossível cai no estado vazio com "limpar", que restaura a lista; URL com os três params colada direto renderiza o estado certo. ([06](./done/06-filtro-por-tipo.md))                                                                                                               |
| `e2e/infinite-scroll.spec.ts` | Rolar até a base carrega +20 e a URL vira `?page=2`; repetir até o fim faz o sentinel sumir e aparecer o texto de fim; `/?page=4` colado direto já traz 80 cards **no HTML** (`javaScriptEnabled: false` — prova o SSR); clicar num card e voltar mantém a quantidade e a posição de scroll; filtrar reseta para 20 sem misturar o conjunto anterior; "Carregar mais" alcançável por Tab e o foco sobrevive ao anexar. ([14](./done/14-infinite-scroll-na-listagem.md)) |
| `e2e/detalhes.spec.ts`        | Clicar no card do pikachu leva a `/pokemon/pikachu` e mostra habilidades e movimentos; voltar de uma listagem filtrada preserva `?q=`/`?type=`; `/pokemon/nao-existe` mostra o not-found (ver ressalva abaixo). ([07](./done/07-pagina-de-detalhes.md))                                                                                                                                                                                                                 |
| `e2e/loading-filtros.spec.ts` | Com o POST da server action atrasado via `page.route`, digitar mostra o indicador e a grade esmaecida, e o input **continua com foco e editável**; ao resolver, indicador some e a grade traz o novo conjunto; `aria-busy` alterna `true`→`false`; sem atraso, o indicador não pisca. ([13](./done/13-estado-de-loading-nos-filtros.md))                                                                                                                                |
| `e2e/seo.spec.ts`             | `/` tem `<title>` e `description` não vazios; `/pokemon/pikachu` tem title contendo "Pikachu" e `og:image` **absoluta**; `<html lang="pt-BR">`; `/sitemap.xml` responde 200 e contém `/pokemon/pikachu`; `/robots.txt` responde 200. ([08](./done/08-seo-e-metadata.md))                                                                                                                                                                                                |
| `e2e/a11y.spec.ts`            | `@axe-core/playwright`: zero violação serious/critical em `/`, `/?q=zzzz`, `/?type=<tipo>` e `/pokemon/pikachu`. Teclado: Tab do topo alcança busca → filtro → primeiro card → "Carregar mais", nessa ordem, com foco visível; Enter no card navega. `aria-live` anuncia o novo total após buscar. ([09](./done/09-acessibilidade.md))                                                                                                                                  |
| `e2e/erros/catalogo.spec.ts`  | `MOCK_MODE=fail-catalog`: a listagem mostra a UI de erro **com botão de retry** — não tela branca, não lista vazia disfarçada de "nenhum resultado". ([03](./done/03-listagem-e-estados.md))                                                                                                                                                                                                                                                                            |
| `e2e/erros/detalhe.spec.ts`   | `MOCK_MODE=fail-detail`: `/pokemon/<nome>` mostra a UI de erro com retry. ([07](./done/07-pagina-de-detalhes.md))                                                                                                                                                                                                                                                                                                                                                       |
| `e2e/erros/fatia.spec.ts`     | Server action falhando (`page.route` → 500 no POST): os cards já carregados **permanecem** e aparece "Tentar novamente"; o retry, com a rota liberada, anexa normalmente. ([14](./done/14-infinite-scroll-na-listagem.md))                                                                                                                                                                                                                                              |

`e2e/smoke.spec.ts` é absorvido pelo `listagem.spec.ts` e removido — cumpriu o papel de provar a
infra na story 01.

### Ressalva: o 404 documentado

O README registra em **Limitações conhecidas** que `/pokemon/<inexistente>` responde **200** com a
página de not-found, por incompatibilidade entre `dynamicParams` e Cache Components. A story 07
planejou asserção de 404 — **contradiz o comportamento documentado**.

Decisão: o teste afirma o que o app faz hoje — a página de not-found é exibida — e um comentário no
spec aponta a limitação do README. Nada de `expect(status).toBe(404)` marcado como `.fixme`, que
vira ruído permanente. Se algum dia a limitação cair, o teste aperta junto.

### Ajustes fora de `e2e/`

- `lib/api/http.ts` — base URL por env (+ o unit do fallback, que a story 16 não escreveu por
  depender desta mudança).
- `next.config.ts` — `remotePatterns` aceitando o host do mock **apenas** quando `POKEAPI_BASE_URL`
  aponta para localhost.
- `.github/workflows/ci.yml` — job de e2e roda os dois projetos e sobe o relatório como artefato em
  falha (a [10-qualidade](./done/10-qualidade-lint-format-ci.md) já previu o artefato).
- `README.md` — remover "Sem testes automatizados" das limitações e documentar `PW_LIVE=1` e o mock
  server na seção Testes. A limitação deixa de ser verdade ao fim desta story; deixá-la escrita é
  documentação mentindo.

## Validação

Comandos:

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run format:check` — limpos.
- `pnpm build` — limpo. Com `POKEAPI_BASE_URL` apontando para o mock, o log mostra as 100 rotas de
  detalhe prerenderizadas (é a prova de que o mock cobre o contrato inteiro que o app consome).
- `pnpm test` — a suíte da story 16 continua verde (o `http.ts` mudou).
- `pnpm run test:e2e` — os dois projetos verdes, do zero, **com a rede desligada** (é o teste do
  teste: se passar offline, o mock está de fato no caminho).
- `PW_LIVE=1 pnpm run test:e2e --project=chromium` — a suíte feliz também passa contra a PokeAPI
  real. Divergência aqui = fixture mentindo sobre o contrato da API.

Casos a cobrir: os da tabela de specs acima.

Verificação de que o teste testa intenção (revisão, item a item):

- `grep` por `data-testid`, `locator("." `, `locator("#` e `toHaveScreenshot` nos specs novos →
  **zero ocorrência**. Locators por `getByRole`/`getByLabel`/`getByText`.
- Nenhum `waitForTimeout` fixo — espera por estado observável (`toBeVisible`, `toHaveURL`).
- Prova negativa: com o app rodando, quebrar de propósito uma regra (remover o reset de `page` ao
  filtrar; fazer o `catch` da server action engolir o erro em silêncio) faz **o** spec
  correspondente falhar. Reverter — não commitar a quebra.
- Prova de que o mock está ativo: subir a suíte com o mock server derrubado deve falhar o
  `webServer`, não passar verde por cair na PokeAPI real.

Verificação manual:

- `pnpm run test:e2e --project=chromium --headed` uma vez, olhando: os fluxos fazem o que os nomes
  dizem, e não passam por caminho lateral.
- Relatório de falha (`playwright-report/`) abre com trace utilizável.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm run lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- **Story 15 (virtual list)** — não implementada. `e2e/virtual-list.spec.ts` nasce com ela.
- Multi-browser (Firefox/WebKit) — a decisão da story 01 de rodar só Chromium não muda aqui.
- Regressão visual / screenshot testing.
- E2E contra a URL publicada na Vercel — a [12-deploy](./done/12-deploy-vercel.md) já define isso
  como passo de deploy, com `PLAYWRIGHT_TEST_BASE_URL`.
- Teste de carga ou de performance (Lighthouse CI).
- Corrigir a limitação do 404 — é comportamento conhecido e documentado; virar 404 de verdade é
  story própria.
- Consertar qualquer bug que estes testes revelem: aqui se escreve teste. Bug achado vira story.
