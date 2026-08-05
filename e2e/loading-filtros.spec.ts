import { expect, test, type Page } from "@playwright/test";

import { cards, listSize, searchInput, typeFilter } from "./locators";
import { holdRequests, isFilterNavigation } from "./network";

/**
 * Feedback de espera dos filtros.
 *
 * A navegacao de filtro sai do browser para o servidor Next, e essa sim da para
 * interceptar com `page.route` (o I/O com a PokeAPI, nao — ele e server-side).
 * Em vez de atrasar por um tempo fixo, a requisicao fica **presa** ate o teste
 * soltar: as assercoes do estado pendente rodam sem corrida com relogio.
 */

/**
 * O indicador e `aria-hidden` de proposito — quem anuncia a mudanca para leitor
 * de tela e o `aria-busy` da area de resultado. Sem papel na arvore de
 * acessibilidade, o que resta e o mesmo estado que o CSS observa.
 */
function pendingIndicator(page: Page) {
  return page.locator("[data-pending]");
}

function resultsArea(page: Page) {
  return page.locator("[aria-busy]");
}

test("enquanto a navegacao nao volta, o campo continua editavel e com foco", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  const release = await holdRequests(page, isFilterNavigation);

  await searchInput(page).fill("pika");

  await expect(pendingIndicator(page)).toBeVisible();
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "true");
  // Grade esmaecida em vez de trocada por skeleton: durante a digitacao, piscar
  // a lista inteira a cada tecla e mais ruido do que informacao.
  await expect(resultsArea(page)).toHaveCSS("opacity", "0.5");

  // Bloquear o campo durante a transicao tiraria o foco de quem esta digitando.
  await expect(searchInput(page)).toBeFocused();
  await searchInput(page).fill("pikach");
  await expect(searchInput(page)).toHaveValue("pikach");

  release();

  await expect(page).toHaveURL("/?q=pikach");
  await expect(pendingIndicator(page)).toHaveCount(0);
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "false");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first().getByRole("heading", { name: "Pikachu" })).toBeVisible();
});

test("navegacao de filtro que resolve sozinha nao deixa o indicador aceso", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await typeFilter(page).selectOption("fire");

  await expect(page).toHaveURL("/?type=fire");
  // O anti-flash em si (100ms de atraso na animacao) vive no CSS e nao tem
  // sinal observavel de fora; o que da para garantir daqui e que o estado
  // pendente nao fica preso depois que a navegacao terminou.
  await expect(pendingIndicator(page)).toHaveCount(0);
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "false");
});
