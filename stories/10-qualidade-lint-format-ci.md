# Plan: Qualidade — Prettier, ESLint, Husky e CI

## Context

Diferenciais do README: "ESLint, Prettier, Husky" e "Pipeline CI". O projeto já tem o
`eslint-config-next` do scaffold, mas nenhum formatador, nenhum hook e nenhum CI — hoje nada impede
subir código quebrado.

Decisões travadas:

- Story vem **depois** das features (01–09) de propósito: assim o CI já nasce rodando a suíte
  inteira de verdade, em vez de um pipeline vazio que vai sendo remendado.
- Hook de pre-commit roda **lint-staged** (só o que mudou) — pre-commit lento acaba sendo pulado
  com `--no-verify`. Teste completo é responsabilidade do CI, não do commit.
- CI no **GitHub Actions**, em PR e push na branch principal.
- Trade-off aceito: e2e no CI encarece o pipeline (browser + build). Vale porque a cobertura real
  dos Server Components mora lá (ver [01-infra-de-testes](./01-infra-de-testes.md)).

## Desenho

- Dependências (dev): `prettier`, `prettier-plugin-tailwindcss`, `husky`, `lint-staged`.
- `.prettierrc` + `.prettierignore`; plugin do Tailwind para ordenar classes de forma determinística.
- `eslint.config.mjs` — manter o config do Next e acrescentar as regras que travam problema real:
  proibir `any` explícito, exigir `import type`, e proibir `.only` em teste. Não inflar com regras
  de estilo (o Prettier cuida disso).
- Scripts: `format` (write), `format:check`.
- `husky` — `pre-commit` chamando `lint-staged` (ESLint --fix + Prettier nos arquivos staged).
- `.github/workflows/ci.yml` — `pnpm/action-setup` + Node LTS + cache do pnpm; jobs:
  1. `quality`: `install --frozen-lockfile` → `format:check` → `lint` → `typecheck`;
  2. `test`: `pnpm test` (com coverage) — depende de `quality`;
  3. `e2e`: instalar browsers do Playwright, `pnpm build`, `pnpm test:e2e`, subir
     `playwright-report` como artefato em caso de falha.
- Badge do workflow no README (fecha com a story 11).

## Validação

Comandos:

- `pnpm format:check` — limpo em todo o repo (a primeira rodada de `format` entra nesta story).
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:e2e` — todos verdes, já que
  o CI vai exigir exatamente isso.

Casos a cobrir:

- Commit de arquivo mal formatado é reformatado pelo hook antes de entrar (verificação manual, é
  comportamento de tooling, não de código).
- Regra nova do ESLint pega o caso que deveria pegar: um `any` explícito e um `.only` de teste
  falham o `pnpm lint` (verificar num arquivo descartável, não commitar).
- CI: PR de teste com lint quebrado **falha** o job `quality` — pipeline verde por não rodar nada é
  o risco real aqui.

Verificação manual:

- Abrir um PR de rascunho e conferir os 3 jobs no GitHub; em falha de e2e, o artefato do relatório
  baixa e abre.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Commitlint / Conventional Commits validados por hook.
- Threshold numérico de cobertura travando o merge.
- Dependabot/Renovate, release automation, deploy pelo CI (o deploy é da
  [12-deploy-vercel](./12-deploy-vercel.md)).
