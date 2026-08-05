# Plan: ícone "close" no botão de limpar do input de busca

## Context

O botão de limpar do `SearchInput` hoje é o texto "Limpar" (`components/search/SearchInput.tsx:75-83`).
Texto dentro do campo compete visualmente com o valor digitado, força `pr-16` de padding no input
para não colidir com o termo e destoa do resto da barra de filtros. A convenção de campo de busca
é um "X" à direita.

Decisões travadas:

- **SVG inline, sem dependência nova.** O projeto não tem lib de ícones (`package.json` só tem
  `@tanstack/react-virtual` como dep de UI). Trazer `lucide-react` por um único ícone não paga o
  custo de bundle nem a discussão de padronização — se depois vierem 5+ ícones, aí sim vira story
  própria de design system.
- **O botão continua sendo um `<button>` com nome acessível.** O ícone é decorativo
  (`aria-hidden="true"`, sem `<title>`); o nome vem de `aria-label="Limpar busca"`. Trocar
  ícone por texto não pode custar acessibilidade — a story 09 já fixou esse padrão.
- **O nome acessível muda de "Limpar" para "Limpar busca".** Sem o contexto visual do campo, um
  leitor de tela ouvindo só "Limpar" na lista de elementos não distingue esse botão do
  `ClearFiltersLink` ("Limpar filtros"). Isso quebra os seletores dos testes de propósito — eles
  são atualizados junto.
- **`type="text"` permanece.** O comentário em `SearchInput.tsx:65` continua válido: com
  `type="search"` o Chrome desenha o X nativo e passaríamos a ter dois X sobrepostos.
- **Só o input de busca.** O `ClearFiltersLink` (limpar filtros, fora do campo) segue textual —
  ali o texto é a affordance certa, não há campo para poluir.

Mapeia para o requisito de **UX/polimento da listagem** do README (busca e filtros).

## Desenho

### `components/search/SearchInput.tsx`

- Substituir o conteúdo textual `Limpar` por um SVG inline de "X":
  - `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`, `strokeWidth={2}`,
    `strokeLinecap="round"`, duas linhas cruzadas (`M6 6 L18 18` e `M18 6 L6 18`);
  - `className="size-4"`, `aria-hidden="true"`, `focusable="false"`.
- Adicionar `aria-label="Limpar busca"` ao `<button>`.
- Ajustar as classes do botão: de `px-2 py-1 text-xs font-medium` para um alvo de toque quadrado —
  `flex size-7 items-center justify-center` — mantendo `absolute top-1/2 right-2 -translate-y-1/2`,
  as cores (`text-zinc-600 hover:text-zinc-900` + variantes dark) e o anel de foco
  (`focus-visible:outline-*`) intactos. Alvo ≥ 24px atende o mínimo de toque.
- Reduzir o padding direito do input de `pr-16` para `pr-10` — o ícone ocupa bem menos que o texto.
- Nenhuma mudança em `handleChange`, debounce, `signalPending` ou navegação: o comportamento de
  limpar (`handleChange("")` → remove `q` da URL) é exatamente o mesmo.

### `components/search/SearchInput.test.tsx`

- Atualizar os três pontos que buscam por `{ name: "Limpar" }` (linhas 125, 136, 140) para
  `{ name: "Limpar busca" }`.
- Adicionar asserção de que o botão continua exposto por nome acessível mesmo sem texto visível
  (é o teste que impede uma regressão de a11y ao trocar texto por ícone).

### Fora dessas duas: nada

`app/page.tsx`, `ClearFiltersLink.tsx`, `EmptyState.tsx` e os testes de grid/lista referenciam
"Limpar filtros" — outro componente, não são tocados. O e2e `e2e/filtros.spec.ts:48` usa
`getByRole("link", { name: "Limpar filtros" })` — link, não button; segue válido.

## Validação

Comandos:

```
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
```

Casos a cobrir (unit/component, `SearchInput.test.tsx`):

- **botão ausente sem termo** — com `/` limpo, `queryByRole("button", { name: "Limpar busca" })`
  é `null`; o botão só aparece depois de digitar.
- **nome acessível sem texto visível** — com `/?q=pika`,
  `getByRole("button", { name: "Limpar busca" })` resolve, provando que o `aria-label` cobre a
  perda do texto e o SVG não vaza para a árvore de acessibilidade (`aria-hidden`).
- **limpar continua limpando** — clique no botão zera o input, remove `q` da URL (não deixa
  `?q=`) e navega para `/`; asserção sobre `navigations` preservada.
- **busca + filtro** — com `/?q=pika&type=electric`, limpar a busca pelo ícone remove só `q` e
  preserva `type=electric`.
- **sem ambiguidade com o outro botão** — em uma render que tenha busca ativa, "Limpar busca" e
  "Limpar filtros" resolvem para elementos distintos.

E2E (`e2e/filtros.spec.ts`, se algum passo depender do botão do campo): o fluxo atual usa o link
"Limpar filtros" e não deve quebrar; rodar a suíte confirma. O teste de axe da story 09 cobre o
botão só-ícone — nome acessível ausente falharia ali.

Verificação manual (`pnpm dev`, `http://localhost:3000`):

- digitar "pika" → o X aparece à direita dentro do campo, sem sobrepor o texto digitado;
- clicar no X → campo limpa, lista volta ao estado sem busca;
- `Tab` até o botão → anel de foco visível; `Enter`/`Space` limpam;
- hover muda a cor do ícone; dark mode com contraste ok;
- mobile (~375px) e desktop: o X fica alinhado verticalmente ao centro do campo e o alvo de toque
  é confortável.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente —
> nenhum código novo entra sem teste (quando há runner disponível). `pnpm lint` e `pnpm build`
> limpos. Sem `skip`/`only` sem justificativa no código.

## Fora de escopo

- Trocar o `ClearFiltersLink` ("Limpar filtros") por ícone — permanece textual de propósito.
- Introduzir lib de ícones / design system de ícones no projeto.
- Ícone de lupa ou spinner dentro do próprio campo de busca (o pending segue no `TypeFilter`,
  decisão da story 13).
- Tooltip no hover do botão — `aria-label` não gera tooltip nativa, mas adicionar `title` é ruído
  sem pedido.
- Animação de entrada/saída do botão.
