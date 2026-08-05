import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Locators compartilhados pelos specs.
 *
 * Todos consultam por papel ou por rotulo — o que o usuario ve —, nunca por
 * classe, id ou `data-testid`. Um seletor de CSS quebraria numa mudanca de
 * estilo sem que nada tenha deixado de funcionar, e passaria verde numa
 * mudanca de marcacao que quebra o leitor de tela.
 */

/**
 * Cards **montados** na grade.
 *
 * Sob virtualizacao o card deixa de ser um `article` para a arvore de
 * acessibilidade e passa a ser o `listitem` da lista — e so as linhas visiveis
 * existem no DOM. Os `<li>` dos badges de tipo tambem sao `listitem`, entao o
 * que separa um do outro e o link que so o card tem.
 *
 * Para "quantos itens a lista tem", use `listSize`: contar isto aqui mede a
 * janela de rolagem, nao a lista.
 */
export function cards(page: Page): Locator {
  return page.getByRole("listitem").filter({ has: page.getByRole("link") });
}

/**
 * Tamanho da lista logica — quantos itens o scroll infinito ja acumulou,
 * independentemente de quantos estao montados.
 *
 * Sai do `aria-setsize`, que e o numero que o leitor de tela anuncia: com o DOM
 * parcial, ele e a unica leitura honesta do tamanho da lista.
 */
export async function listSize(page: Page): Promise<number> {
  const first = cards(page).first();
  if ((await first.count()) === 0) return 0;

  const setSize = await first.getAttribute("aria-setsize");
  // Sem `aria-setsize` a grade nao virtualizou (sem JS, ou antes de hidratar):
  // ai o DOM ja e a lista inteira.
  return setSize === null ? cards(page).count() : Number(setSize);
}

/**
 * Espera a listagem hidratar.
 *
 * `aria-setsize` so aparece quando a grade virtual assume, o que acontece
 * depois da hidratacao — e o sinal observavel de que os controles da pagina ja
 * respondem. Interagir antes disso perde o evento em silencio: o React repoe o
 * valor do render inicial no commit, e o teste falha longe da causa.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await expect(cards(page).first()).toHaveAttribute("aria-setsize", /^\d+$/);
}

export function searchInput(page: Page): Locator {
  return page.getByLabel("Buscar por nome");
}

export function typeFilter(page: Page): Locator {
  return page.getByLabel("Filtrar por tipo");
}

export function loadMoreButton(page: Page): Locator {
  return page.getByRole("button", { name: "Carregar mais" });
}

/**
 * Container do resultado. Sem papel proprio — o que se observa nele e o
 * `aria-busy`, que e como o leitor de tela fica sabendo que a lista na tela
 * ainda e a anterior.
 */
export function resultsArea(page: Page): Locator {
  return page.locator("[aria-busy]");
}

/**
 * Total anunciado quando a lista inteira ja esta na tela ("N pokemons
 * encontrados"). Enquanto o scroll nao acabou o contador diz "Mostrando X de
 * Y", entao esperar por esta forma tambem serve de sinal de que a filtragem
 * terminou de renderizar.
 */
export async function announcedTotal(page: Page): Promise<number> {
  const label = page.getByText(/^\d+ pokemons? encontrados?$/);
  await expect(label).toBeVisible();

  const text = (await label.textContent()) ?? "";
  return Number(/^\d+/.exec(text)?.[0]);
}

/**
 * Rola ate o meio da lista e espera a grade virtual acompanhar.
 *
 * Rolar e sincrono, montar as linhas novas nao: sem esperar, o teste ainda
 * enxerga a janela do topo e escolheria um card que sai do DOM no quadro
 * seguinte. O sinal de que o virtualizer reagiu e o primeiro card montado
 * deixar de ser o item 1 da lista.
 */
export async function scrollToMiddle(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

  await expect.poll(() => cards(page).first().getAttribute("aria-posinset")).not.toBe("1");
}

/**
 * Tab ate o alvo receber o foco, como quem navega so por teclado.
 *
 * Espera por estado observavel (o alvo virou `activeElement`) em vez de contar
 * um numero fixo de Tabs, que passaria a mentir assim que um controle novo
 * entrasse no meio do caminho.
 *
 * O limite e generoso de proposito: tabular pelos cards rola a pagina, o que
 * acorda o scroll infinito e anexa mais links entre o foco atual e o alvo. No
 * pior caso sao os 100 do catalogo mais os controles.
 */
export async function tabUntilFocused(
  page: Page,
  target: Locator,
  maxPresses = 150,
): Promise<void> {
  for (let press = 0; press < maxPresses; press += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }

  throw new Error(`O alvo nao recebeu foco depois de ${maxPresses} Tabs.`);
}

/** Largura do contorno de foco do elemento ativo — `0px` significa foco invisivel. */
export function focusRingWidth(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active ? getComputedStyle(active).outlineWidth : "0px";
  });
}
