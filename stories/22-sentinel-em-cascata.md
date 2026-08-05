# Plan: Sentinel do scroll infinito para de disparar em cascata

## Context

Bug encontrado pelos testes da [17-testes-e2e](./done/17-testes-e2e.md): os specs de scroll
infinito só ficaram estáveis segurando as requisições (`holdRequests`/`allowOnly` em
`e2e/network.ts`), porque a quantidade de fatias carregadas não é previsível. Foi registrado lá
como achado; esta story conserta.

### O que acontece

`LoadMoreSentinel` (`components/pokemon/LoadMoreSentinel.tsx`) guarda a visibilidade em estado e
reage a ela:

```ts
useEffect(() => {
  if (enabled && isVisible) onVisible();
}, [enabled, isVisible, onVisible]);
```

com `enabled = hasMore && !error && !loading` vindo do `InfiniteList`. O `!loading` ali é
deliberado e está comentado no código: ele existe para o efeito **reavaliar** quando a fatia chega,
já que o `IntersectionObserver` só avisa quando a interseção _muda_ — sem isso, a base continuaria
visível depois de anexar e o scroll carregaria uma vez só.

O efeito colateral é que `enabled` voltando a `true` dispara `onVisible()` imediatamente, com o
`isVisible` **anterior**, antes de o layout com a fatia nova ter assentado. Duas consequências
observadas:

1. **Fatia recém-anexada dispara a seguinte** mesmo quando já empurrou a base para fora da
   viewport — o observer ainda não reprocessou. Com `rootMargin: "200px"`, chega a carregar 60
   itens onde 40 bastavam.
2. **Navegar por teclado carrega a lista inteira.** Tabular pelos cards rola a página, a base entra
   na margem de 200px, e cada fatia anexada realimenta o ciclo. Quem usa teclado ou leitor de tela
   recebe o catálogo todo sem ter pedido — o oposto do que o scroll infinito promete.

Não é erro de correção: nada duplica, nada some, a lista final está certa. É excesso de trabalho —
requisições, render e memória — e, no caso do teclado, é regressão de acessibilidade sobre o que a
[09-acessibilidade](./done/09-acessibilidade.md) e a
[14-infinite-scroll](./done/14-infinite-scroll-na-listagem.md) entregaram.

A [15-virtual-list](./done/15-virtual-list-na-listagem.md) atenua o custo de render (linha fora da
viewport não fica montada) mas **não** o de rede, e não muda o gatilho.

### Decisão travada: uma carga por interseção assentada

O `enabled` deixa de ser o gatilho. Depois de uma carga, o sentinel só dispara de novo quando a
interseção for **reavaliada pelo observer com o layout já assentado** — não com o valor que estava
em estado antes de a fatia entrar no DOM.

Mecanismo: ao sair do estado de carregamento, o sentinel força uma releitura do observer (parar e
reobservar a âncora num frame posterior, via `requestAnimationFrame`) em vez de reusar `isVisible`.
Se a base continuar intersectando depois que a fatia foi pintada — viewport mais alta que a fatia,
por exemplo — dispara de novo, que é o caso legítimo que o `!loading` de hoje protege. Se não
continuar, para.

Por que não as alternativas:

- **Disparar só na transição `false → true` do observer** (edge-triggered puro) trava a lista em
  viewport alta: a base nunca sai da tela, nunca há nova borda, e o usuário fica com um botão que
  precisa clicar — regressão direta da story 14.
- **Reduzir o `rootMargin`** diminui a frequência do sintoma sem eliminá-lo, e piora a antecipação
  que a story 14 escolheu de propósito ("carrega um pouco antes do fim, para a fatia chegar durante
  a rolagem").
- **`debounce`/`setTimeout` fixo** é atraso arbitrário que muda de comportamento por máquina, e é
  exatamente o tipo de espera que os testes desta base proíbem.

Trade-off aceito: um frame a mais de latência entre a fatia chegar e a próxima começar, no caso de
viewport alta. Imperceptível ao lado das requisições que deixam de sair.

### Fora da decisão: o botão continua sendo o caminho do teclado

`LoadMoreSentinel` envolve o `ListStatus`, que tem o botão "Carregar mais" real. Ele continua
existindo, alcançável por Tab e disparando a carga por Enter — o conserto não pode empurrar quem
usa teclado para "role até a base". O que muda é que tabular **pelos cards** deixa de carregar em
cadeia; pedir explicitamente pelo botão continua carregando uma fatia por clique.

## Desenho

### `components/pokemon/LoadMoreSentinel.tsx`

- O par `isVisible` (estado) + efeito que reage a `enabled` sai.
- A âncora é observada como hoje (`rootMargin: "200px"`). O callback do observer passa a ser a
  única origem de disparo: intersectou **e** o sentinel está armado → `onVisible()` e desarma.
- Rearme: quando `enabled` volta a `true` (fatia terminou de chegar), agenda um
  `requestAnimationFrame` que rearma **e** força o observer a reavaliar a âncora. É esse passo que
  faz a decisão acima existir de fato — sem ele, o observer fica em silêncio com a base ainda
  visível e a lista trava.
- `onVisible` continua lido de um ref para o callback do observer não precisar ser recriado a cada
  render (hoje isso já é atenuado pelo `useCallback` do `InfiniteList`, mas o gatilho passa a viver
  dentro do observer e não pode depender de identidade de função).
- Limpeza: `cancelAnimationFrame` e `observer.disconnect()` no unmount. O remount por troca de
  filtro (`key` em `app/page.tsx`) não pode deixar frame agendado.
- O comentário do topo é reescrito — o parágrafo que hoje justifica o estado de visibilidade passa
  a descrever o rearme e a razão dele.

### `components/pokemon/InfiniteList.tsx`

Sem mudança de lógica. Só o comentário das linhas 108–111 ("`!loading` no `enabled` nao e so
guarda…"), que passa a apontar o rearme como o mecanismo de reavaliação.

### `e2e/network.ts`

Os helpers `holdRequests`/`allowOnly` **permanecem** — segurar a requisição continua sendo a forma
correta de testar estado de loading. O que muda é que os specs param de precisar deles só para
tornar a contagem determinística.

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

`components/pokemon/LoadMoreSentinel.test.tsx`, com `IntersectionObserver` stubado (o stub já
existe desde a story 16) — a asserção é sobre **quantas vezes o carregamento foi pedido**, não
sobre chamada de mock interno:

- entrar em viewport com `enabled` dispara **uma** vez (regressão da story 16, não pode quebrar);
- `enabled: false` não dispara;
- **entrar em viewport uma vez e o `enabled` oscilar `true → false → true` sem nova interseção não
  dispara de novo** — é o caso central desta story;
- oscilar `enabled` **com** o observer reportando interseção depois do rearme dispara de novo — a
  viewport alta continua encadeando (o caso que o `!loading` protegia);
- o observer reportando `isIntersecting: false` e depois `true` dispara de novo (rolagem normal);
- desmontar durante o rearme não dispara nada nem vaza frame agendado;
- o botão filho continua alcançável por Tab e ativa por Enter.

`components/pokemon/InfiniteList.test.tsx`:

- anexar uma fatia continua funcionando e a URL continua virando `?page=N` via `replaceState`
  (garantias da story 14 intactas);
- duas chamadas concorrentes continuam virando uma (a trava síncrona do `loadingRef` não sai).

### Casos a cobrir (e2e)

`e2e/infinite-scroll.spec.ts`:

- rolar até a base **uma** vez leva a lista de 20 para **40**, e a URL para `?page=2` — hoje esse
  número não é confiável, e é a razão de o spec segurar requisição. A asserção passa a ser sobre o
  `aria-setsize`/total anunciado, sem `holdRequests`;
- repetir a rolagem avança uma fatia por vez até o fim, e o texto de fim aparece;
- **tabular pelos primeiros cards não carrega fatia nenhuma** — a prova do caso de teclado. Tab até
  o primeiro card, alguns Tabs adiante, e o total continua 20;
- Tab até o botão "Carregar mais" e Enter carrega **uma** fatia, e o foco permanece no botão (a
  garantia da story 14, agora sob o gatilho novo).

`e2e/erros/fatia.spec.ts`: com o POST da server action falhando, os cards permanecem, o retry
aparece, e liberar a rota + retry anexa **uma** fatia — o erro não pode rearmar o sentinel em loop.

### Verificação manual (`pnpm dev`, DevTools → Network)

- Rolar até a base uma vez: **um** POST da server action, não dois.
- Rolagem contínua até o fim: um POST por fatia, cinco no total.
- Janela alta (viewport ~1400px, onde 20 cards não enchem a tela): a lista continua encadeando
  sozinha até preencher — não trava esperando clique.
- Tab a partir do topo, passando por 10 cards: nenhuma requisição sai.
- Throttling Slow 3G: nenhuma requisição sobreposta; os skeletons continuam reservando altura.

> **Gate (trava a story):** todo caminho novo ou alterado tem cobertura correspondente — nenhum
> código novo entra sem teste. `pnpm lint` e `pnpm build` limpos. Nenhum teste das stories 14/16/17
> removido por ter ficado inconveniente — os que dependiam de `holdRequests` só para estabilizar
> contagem são simplificados, não deletados. Sem `skip`/`only` sem justificativa no código.

## Fora de escopo

- Trocar o `rootMargin: "200px"` — a antecipação da story 14 continua como está.
- Trocar `IntersectionObserver` por evento de scroll.
- Paginação de volta, ou botão "Carregar mais" como único gatilho.
- Prefetch da próxima fatia antes de a base aparecer.
- Mexer no `?page=N` como cursor, no `replaceState` ou na restauração ao voltar do detalhe
  (story 14).
- Virtualização (story 15) — o DOM parcial já está entregue; aqui o alvo é rede, não render.
- Limitar o total de fatias carregadas por sessão.
