# Plan: Infra de testes (Vitest + RTL + Playwright)

## Context

O README exige "Ferramenta de testes automatizados" e cobertura de listagem, busca, paginação,
detalhes e cenários de erro. O projeto hoje é o scaffold cru do `create-next-app`: só
`dev/build/start/lint`, **nenhum runner instalado**. Toda story seguinte tem gate de teste, então
esta é a primeira e destrava as demais.

Decisões do usuário:

- **Vitest + Testing Library** para unit/componente, **Playwright** para e2e.
- Motivo do Playwright: os docs do Next 16 (`node_modules/next/dist/docs/01-app/02-guides/testing/index.md`)
  dizem explicitamente que async Server Components **não** são bem suportados por unit test e
  recomendam e2e para eles. Como a arquitetura escolhida é Server-Component-first (ver
  [02-camada-de-servicos-pokeapi](./02-camada-de-servicos-pokeapi.md)), sem e2e ficaria um buraco
  de cobertura justamente no caminho principal.
- Playwright também cobre o diferencial "testes end-to-end" do README.

Trade-off aceito: dois runners = mais setup e CI mais lento. Vale pela cobertura real dos Server
Components.

## Desenho

- Seguir os guias oficiais: `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` e
  `.../playwright.md`. Não inventar config.
- Dependências (dev): `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`,
  `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`,
  `vite-tsconfig-paths`, `@playwright/test`.
- Arquivos:
  - `vitest.config.mts` — ambiente `jsdom`, plugin react, `tsconfigPaths()`, `setupFiles`,
    `include` só de `**/*.test.{ts,tsx}`, `exclude` da pasta de e2e.
  - `vitest.setup.ts` — importa `@testing-library/jest-dom/vitest`.
  - `playwright.config.ts` — `webServer` subindo `pnpm build && pnpm start` (ou `pnpm dev` em
    local), `baseURL` local, `testDir: e2e/`.
  - `e2e/smoke.spec.ts` — teste mínimo: home responde 200 e renderiza o `<h1>`.
  - Um teste de componente trivial provando que a pipeline de unit roda.
- Scripts em `package.json`: `test` (vitest run), `test:watch`, `test:coverage`, `test:e2e`,
  `typecheck` (`tsc --noEmit`).
- `.gitignore`: adicionar `playwright-report/`, `test-results/`, `coverage/`.

## Validação

Comandos:

- `pnpm typecheck` — limpo.
- `pnpm lint` — limpo (configs de teste não podem quebrar o ESLint do Next).
- `pnpm test` — o teste de componente trivial passa.
- `pnpm test:e2e` — o smoke test passa contra o build de produção.
- `pnpm build` — limpo.

Casos a cobrir nesta story:

- Unit: um componente renderiza e a asserção de `jest-dom` (`toBeInTheDocument`) funciona — prova
  que setupFiles carregou.
- E2E: `/` retorna 200 e mostra conteúdo — prova que o `webServer` do Playwright sobe o app.

Verificação manual:

- `pnpm test` roda em < 10s no scaffold vazio (se demorar muito, o `include`/`exclude` está errado).
- `pnpm test:e2e` **não** tenta rodar os arquivos `.test.tsx` do Vitest e vice-versa.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Storybook (usuário optou por não incluir).
- CI rodando esses comandos — fica em [10-qualidade-lint-format-ci](./10-qualidade-lint-format-ci.md).
- Threshold numérico de cobertura no config — só o relatório; o gate é qualitativo por story.
- Qualquer código de produto (listagem, busca, detalhes).
