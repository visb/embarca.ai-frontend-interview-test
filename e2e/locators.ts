import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Locators compartilhados pelos specs.
 *
 * Todos consultam por papel ou por rotulo — o que o usuario ve —, nunca por
 * classe, id ou `data-testid`. Um seletor de CSS quebraria numa mudanca de
 * estilo sem que nada tenha deixado de funcionar, e passaria verde numa
 * mudanca de marcacao que quebra o leitor de tela.
 */

/** Cards da listagem. Cada card e um `<article>`, entao o papel ja os isola. */
export function cards(page: Page): Locator {
  return page.getByRole("article");
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
