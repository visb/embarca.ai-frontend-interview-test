# Plan: Acessibilidade

## Context

Acessibilidade é diferencial do README e o usuário optou por incluí-la. Story de auditoria, depois
das telas prontas (03–07): a11y aplicada em cima do produto completo pega os problemas reais
(ordem de foco, anúncio de mudança de lista) que revisão por componente isolado não pega.

Decisões travadas:

- Alvo: **WCAG 2.1 AA** nos itens verificáveis — contraste, foco visível, nome acessível, teclado,
  landmarks.
- Auditoria automatizada com **`@axe-core/playwright`** dentro da suíte e2e já existente, em vez de
  ferramenta manual: vira regressão travada em CI, não um check de uma vez só.
- Trade-off aceito: axe não pega tudo (ordem lógica, texto de link ambíguo). Por isso há também um
  checklist manual explícito abaixo; um não substitui o outro.

## Desenho

- Dependência (dev): `@axe-core/playwright`.
- `e2e/a11y.spec.ts` — roda o axe em `/`, `/?q=zzzz` (estado vazio), `/?type=fire` e
  `/pokemon/pikachu`, falhando em violações `serious`/`critical`.
- Correções previstas (confirmar na auditoria, não presumir):
  - `TypeBadge`: paleta por tipo com contraste ≥ 4.5:1 — os tipos claros (electric, ice, ground)
    são os suspeitos; ajustar a cor do texto, não só o fundo.
  - Card: o link precisa de nome acessível completo ("Pikachu, número 25"), não só a imagem;
    `alt` da imagem não pode duplicar o texto do link (senão é anunciado duas vezes).
  - `SearchInput`/`TypeFilter`: `<label>` visível associado por `htmlFor`, não só `placeholder`.
  - Resultado da busca anunciado por região `aria-live="polite"` com o contador ("23 pokémons
    encontrados") — hoje um leitor de tela não percebe a lista mudando.
  - Foco visível em todos os interativos (Tailwind `focus-visible`), incluindo cards e paginação.
  - Skip link "pular para o conteúdo" antes do header, e `<main>`/`<nav>` como landmarks.
  - `Pagination`: `<nav aria-label="Paginação">`, `aria-current="page"` (já da story 04) e o
    controle desabilitado não focável.

## Validação

Comandos:

- `pnpm lint`, `pnpm typecheck`, `pnpm build` — limpos.
- `pnpm test` — unit dos atributos acessíveis (queries por role/label, não por classe CSS).
- `pnpm test:e2e` — `a11y.spec.ts` sem violações serious/critical nas 4 rotas.

Casos a cobrir:

- RTL: card é encontrado por `getByRole('link', { name: /pikachu/i })`; input por
  `getByLabelText`; select por `getByLabelText`; paginação por `getByRole('navigation', { name })`.
- E2E teclado: Tab a partir do topo alcança skip link → busca → filtro → primeiro card →
  paginação, nessa ordem; Enter no card navega; o foco fica visível em cada parada.
- E2E leitor de tela (proxy): a região `aria-live` contém o novo total após buscar.
- Axe: zero violações serious/critical em `/`, `/?q=zzzz`, `/?type=fire`, `/pokemon/pikachu`.

Verificação manual:

- Navegar a app inteira **sem mouse**, do início ao detalhe e de volta.
- Zoom 200% no navegador: nada corta nem sobrepõe.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Sem `skip`/`only` sem
> justificativa no código.

## Fora de escopo

- Auditoria com leitor de tela real (NVDA/VoiceOver) — fora do que dá pra automatizar aqui.
- Modo alto contraste / tema escuro dedicado.
- WCAG AAA.
