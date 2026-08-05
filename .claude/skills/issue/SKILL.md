---
name: issue
description: Cria uma story de desenvolvimento deste projeto (teste técnico Next.js + PokeAPI) — levanta o escopo, escreve o plano em stories/NN-slug.md e commita. NÃO implementa, NÃO cria branch, NÃO mergeia. Use quando o usuário invocar /issue ou pedir para abrir/criar uma nova story/issue/tarefa de desenvolvimento.
---

# /issue — criar uma story

Skill invocável pelo usuário via `/issue`. **Só planeja.** Levanta o escopo, escreve o plano e
commita o `.md`. Para aí.

Pode receber um título/descrição como argumento (`/issue filtro por tipo de pokémon`) ou nada
(então levantar o escopo com o usuário).

> **Esta skill NÃO implementa a story.** Implementar é passo manual separado, feito depois.
> `/issue` termina assim que a story está commitada.

## Contexto do projeto

- App **Next.js 16 + React 19 + TypeScript + Tailwind 4**, single-app (não monorepo), `pnpm`.
- Escopo do produto e requisitos obrigatórios estão no `README.md` (listagem, busca/filtros,
  detalhes `/pokemon/[name]`, arquitetura, performance/UX, testes). Ler antes de planejar —
  a story deve mapear para requisitos do README.
- `AGENTS.md`: esta versão do Next.js tem breaking changes; consultar
  `node_modules/next/dist/docs/` antes de decidir API/convenção na story.
- Scripts atuais: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`. **Ainda não há test runner**
  — se a story depender de testes e o runner ainda não existir, ou a story instala o runner, ou
  cita a story que faz isso como pré-requisito.

## Convenções

- Stories ficam em `stories/NN-slug-em-kebab.md`, flat, numeração sequencial, zero-pad de dois
  dígitos (`01-slug.md` … `99-slug.md`; a partir de 100, três dígitos, sem re-padear as antigas).
- Formato: título `# Plan: ...`, seções **Context** (o *porquê*, decisões do usuário, trade-offs
  aceitos), **Desenho/Escopo**, **Validação**, **Fora de escopo**.
- **Validação é obrigatória e SEMPRE traz instruções explícitas de teste** (ver abaixo).
- Commits: Conventional Commits em **pt-BR**.
- Co-author: o modelo corrente (o harness já injeta o rodapé; não cravar nome de modelo).

## Fluxo

### 1. Levantar o escopo

- Se `/issue` veio com texto, usar como ponto de partida; senão perguntar qual o problema/feature.
- Fazer só as perguntas que mudam o resultado (escopo ambíguo, decisão de produto, trade-off:
  SSR vs SSG vs client, onde fica o cache, filtro no servidor ou no cliente etc.).
  Não interrogar à toa — preencher defaults óbvios e seguir.
- Capturar o **porquê** e as **decisões travadas**, não só o quê. É isso que o git diff não guarda.
- Story deve ser fatiável: se o pedido cobre mais de um requisito grande do README, propor quebrar
  em stories menores (uma por fatia entregável) em vez de uma story gigante.

### 2. Descobrir o próximo número

- Varrer `stories/*.md`; pegar o maior `NN` e somar 1. Se não houver nenhuma, começar em `01`.
- Slug em kebab-case curto e descritivo.

### 3. Escrever a story

- Criar `stories/NN-slug.md`.
- Conteúdo mínimo: **Context** (com decisões do usuário), **Desenho** (arquivos/camadas tocadas:
  componente, serviço HTTP, hook, rota), **Validação**, **Fora de escopo**.
- Mostrar o plano ao usuário e confirmar antes de commitar.

#### Validação (OBRIGATÓRIO em toda story)

A seção **Validação** NUNCA pode ser vaga ("rodar os testes"). Ela SEMPRE:

1. Lista os **comandos específicos** que a implementação exige:
   - sempre: `pnpm lint` e `pnpm build` (build valida tipos e o output do Next);
   - se a story toca lógica/UI e há test runner: o comando de unit/component test do projeto;
   - se há e2e configurado e o fluxo foi tocado: o comando de e2e;
   - se a story introduz o test runner: os comandos que ela mesma passa a habilitar.
2. Enumera os **casos a cobrir** — caminhos felizes, erro de rede/404 da PokeAPI, lista vazia,
   loading, combinação busca + filtro, paginação nos limites (primeira/última página) — não só
   "tem teste", mas *o que* o teste prova.
3. Lista a **verificação manual** quando houver UI: rota a abrir com `pnpm dev`, o que deve
   aparecer, responsividade.
4. Fecha com o gate:
   > **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente —
   > nenhum código novo entra sem teste (quando há runner disponível). `pnpm lint` e `pnpm build`
   > limpos. Sem `skip`/`only` sem justificativa no código.

Adaptar ao escopo real: story só de config/infra pode não ter caso de UI; story de UI sem runner
ainda ativo troca "teste" por verificação manual explícita **e** registra o débito de teste em
**Fora de escopo**.

### 4. Commitar a story

- `git add` só do `stories/NN-slug.md`.
- `git commit -m "docs(stories): plano da story NN — <título>"`.
- Commitar na branch atual. **NUNCA criar branch para a story.**
- **Não push automático** — só se o usuário pedir.

### 5. Encerrar

- Informar: story NN criada e commitada.
- **PARAR AQUI.** Não criar branch, não implementar, não rodar testes, não mergear.
- Se o usuário quiser tocar a implementação, ele pede explicitamente depois.

## Proibido

- **Implementar a story** — esta skill só cria o plano. Codar é passo separado, sob pedido explícito.
- **Criar branch** — a story vai na branch atual.
- Abrir PR.
- Push sem pedido explícito.
- Mergear qualquer coisa.
- Continuar para qualquer trabalho além de escrever e commitar o `.md` da story.
