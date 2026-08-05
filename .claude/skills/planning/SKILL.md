---
name: planning
description: Conduz uma sessão de sprint planning a partir de stories/BACKLOG.md — percorre os itens um a um, refina cada um interativamente com o usuário (escopo, decisões, dependências) e, ao fechar cada item, escreve e commita a story via convenções da skill issue. Remove o item refinado do BACKLOG. NÃO implementa, NÃO cria branch. Use quando o usuário invocar /planning ou pedir para "fazer um planning", "refinar o backlog", "planejar a sprint", "rodar um sprint planning".
---

# /planning — sessão de sprint planning

Skill invocável via `/planning`. Funciona como um **facilitador de sprint planning**: lê
`stories/BACKLOG.md`, percorre os itens **um a um**, **refina cada um conversando com o usuário**
e, ao fechar o item, escreve a story e commita — reusando as convenções da skill
[`issue`](../issue/SKILL.md). À medida que refina, **remove o item do BACKLOG**.

> **Esta skill NÃO implementa as stories.** Só refina e escreve os `.md`. Codar é passo manual
> separado, feito depois, sob pedido explícito.

Diferença para o `/issue`: `issue` cria **uma** story sob demanda. `planning` é uma **sessão**
que percorre o backlog inteiro, item a item, interativa, até esvaziar (ou até o usuário parar).

Argumento opcional filtra o tema (`/planning busca` → só itens que casam). Sem argumento,
percorre o BACKLOG inteiro.

## Contexto do projeto

Mesmo contexto da skill `issue` — ler a seção "Contexto do projeto" dela antes de refinar:

- App **Next.js 16 + React 19 + TypeScript + Tailwind 4**, single-app (não monorepo), `pnpm`.
- `README.md` tem o escopo do produto e os requisitos obrigatórios do teste técnico; cada story
  refinada deve mapear para requisito do README.
- `AGENTS.md`: esta versão do Next.js tem breaking changes; consultar `node_modules/next/dist/docs/`
  antes de cravar API/convenção na story.
- Scripts atuais: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`,
  `pnpm format:check`. **Ainda não há test runner instalado** — se a story depender de testes, ou
  ela mesma instala o runner, ou cita como pré-requisito a story que faz isso
  (`stories/01-infra-de-testes.md`).
- As stories já escritas (`stories/*.md`) são a fonte de verdade do que já foi planejado —
  consultar antes de refinar, para não duplicar escopo e para nomear dependências corretamente.

## Modo auto (auto-aprovação)

Flags `auto` / `--auto` / `--yes` (ex: `/planning auto`, `/planning busca --yes`) ligam o
**modo auto**: a sessão **não pede revisão nem confirmação** antes de commitar cada story.

No modo auto:

- **Não mostrar a story para aprovação** nem esperar "ok" — escrever e commitar direto.
- **Não fazer perguntas** de refino. Para cada ambiguidade ou trade-off, **assumir o default
  recomendado** (a opção que seria marcada "Recomendado") e **registrar a decisão tomada** na
  seção **Context** da story (deixar explícito que foi default automático, para o usuário rever
  depois se quiser).
- Percorrer todos os itens da pauta de ponta a ponta sem parar, um commit por story.
- Ao fim, **resumir** as stories criadas (faixa NN–MM) e listar as decisões que foram assumidas
  por default, para o usuário ter visibilidade.

Sem essas flags, vale o fluxo interativo padrão (refina conversando + confirma antes de commitar).

## Mapeamento

- **1 item do BACKLOG = 1 story.** O BACKLOG é uma lista de bullets (uma linha por item).
- Se o BACKLOG estiver agrupado por título (`## tema`), o título é contexto compartilhado — entra
  na seção **Context** das stories daquele bloco.
- Item grande demais (cobre mais de um requisito do README): propor quebrar em stories menores,
  uma por fatia entregável, e refinar cada fatia.
- Dependências entre itens ou com stories já existentes: registrar na seção **Context**
  (ex: "depende da story 05 — busca por nome").

## Convenções herdadas da skill `issue` (respeitar à risca)

- Stories em `stories/NN-slug-em-kebab.md` (flat na raiz de `stories/`), numeração sequencial
  crescente, zero-pad de dois dígitos (a partir de 100, três, sem re-padear as antigas).
- **Descobrir o próximo NN:** varrer `stories/*.md` na raiz (ignorar `BACKLOG.md`), pegar o maior
  `NN`, somar 1. Se não houver nenhuma story, começar em `01`. Incrementar a cada story criada na
  sessão.
- Formato: título `# Plan: ...`, seções **Context** (o *porquê* + decisões travadas +
  dependências), **Desenho** (arquivos/camadas tocadas: componente, serviço HTTP, hook, rota),
  **Validação**, **Fora de escopo**.
- **Validação obrigatória.** Toda story refinada nesta sessão SEMPRE traz a Validação no padrão
  definido em `issue/SKILL.md` → "Validação (OBRIGATÓRIO em toda story)": comandos específicos
  (sempre `pnpm lint` e `pnpm build`; `pnpm typecheck` e `pnpm format:check` quando fizer sentido;
  o comando de teste quando houver runner), casos a cobrir (erro/404 da PokeAPI, lista vazia,
  loading, busca + filtro combinados, limites de paginação), verificação manual da UI e o **gate**:
  > **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
  > código novo entra sem teste (quando há runner disponível). `pnpm lint` e `pnpm build` limpos.
  > Sem `skip`/`only` sem justificativa no código.

  Story de UI sem runner ativo troca "teste" por verificação manual explícita **e** registra o
  débito de teste em **Fora de escopo**. Nenhuma story sai da sessão sem Validação — vale
  inclusive no modo auto.
- Slug em kebab-case curto e descritivo.
- Commits: Conventional Commits em **pt-BR**. Co-author: o modelo corrente (o harness injeta o
  rodapé correto; não cravar nome de modelo).

## Fluxo da sessão

### 1. Abrir a sessão

- Ler `stories/BACKLOG.md` e fatiar em itens (e blocos, se houver títulos).
- Aplicar filtro do argumento, se houver.
- Se vazio (ou nada casa o filtro), avisar e **parar**.
- Descobrir o NN inicial (scan de `stories/*.md` flat, maior + 1; ou `01` se não houver).
- Apresentar a **pauta**: lista dos itens que serão refinados, na ordem. Começar pelo primeiro.

### 2. Refinar item a item (o coração do planning)

Para **cada** item, em sequência:

1. Mostrar o texto cru do item + o contexto do bloco, se houver.
2. **Refinar conversando** — fazer só as perguntas que mudam o resultado: escopo ambíguo, decisão
   de produto, trade-off (SSR vs SSG vs client, onde fica o cache, filtro no servidor ou no
   cliente), dependência de outra story. Propor defaults; não interrogar à toa.
3. Capturar o **porquê** e as **decisões travadas** — é o que o git diff não guarda.
4. Redigir a story `stories/NN-slug.md` no formato acima.
5. **Mostrar a story e confirmar** com o usuário antes de commitar.
6. Ao aprovar → ir ao passo 3 (commit). Se o usuário quiser ajustar, iterar antes de commitar.

### 3. Fechar cada story (commit por item — decisão travada)

Assim que a story é aprovada:

- Editar `stories/BACKLOG.md` removendo **aquele item** (e o título do bloco, se foi o último dele).
- `git add` do `stories/NN-slug.md` criado **e** do `stories/BACKLOG.md`.
- `git commit -m "docs(stories): plano da story NN — <título>"` na **branch atual**.
- **NUNCA criar branch. Não push automático** (só se o usuário pedir).
- Cada story tem **seu próprio commit** — dá pra parar a sessão a qualquer momento sem perder trabalho.

### 4. Avançar / encerrar

- Após commitar, ir ao próximo item da pauta (voltar ao passo 2).
- O usuário pode **encerrar a sessão a qualquer momento** ("para", "chega") — respeitar e parar.
- Ao fim (pauta esgotada ou pedido de parar): resumir as stories criadas (faixa NN–MM) e o estado
  do BACKLOG.
- **PARAR AQUI.** Não criar branch, não implementar, não rodar testes, não mergear.

## Proibido

- **Implementar as stories** — só refina e escreve os planos.
- **Criar branch** — as stories vão na branch atual.
- Abrir PR ou mergear.
- Push sem pedido explícito.
- Refinar item sem confirmar a story antes de commitar — **exceto no modo auto** (ver acima).
- Pular o refino interativo e despejar stories em lote — isso é o oposto de um planning.
- Continuar para qualquer trabalho além de refinar, escrever os `.md`, limpar o BACKLOG e commitar.
