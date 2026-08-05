import { expect, test, type Page } from "@playwright/test";

import { cards, listSize, searchInput, selectTypes, typeFilter, typeOption } from "./locators";
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

test("fechar o dropdown de tipos com mudanca acende o indicador", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  const release = await holdRequests(page, isFilterNavigation);

  await selectTypes(page, ["fire", "water"]);

  // A navegacao sai no fechamento, entao e la que o feedback precisa aparecer —
  // marcar caixas sozinho nao pede nada ao servidor.
  await expect(pendingIndicator(page)).toBeVisible();
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "true");

  release();

  await expect(page).toHaveURL("/?type=fire,water");
  await expect(pendingIndicator(page)).toHaveCount(0);
});

test("fechar o dropdown sem mudar nada nao acende o indicador", async ({ page }) => {
  await page.goto("/?type=fire");
  await expect(cards(page).first()).toBeVisible();

  await typeFilter(page).click();
  // Marcar e desmarcar volta ao conjunto da URL: nada mudou para o servidor
  // dizer, entao nao ha por que navegar nem piscar spinner.
  await typeOption(page, "water").click();
  await typeOption(page, "water").click();
  await page.keyboard.press("Escape");

  await expect(page).toHaveURL("/?type=fire");
  await expect(pendingIndicator(page)).toHaveCount(0);
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "false");
});

test("navegacao de filtro que resolve sozinha nao deixa o indicador aceso", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await selectTypes(page, ["fire"]);

  await expect(page).toHaveURL("/?type=fire");
  // O anti-flash em si (100ms de atraso na animacao) vive no CSS e nao tem
  // sinal observavel de fora; o que da para garantir daqui e que o estado
  // pendente nao fica preso depois que a navegacao terminou.
  await expect(pendingIndicator(page)).toHaveCount(0);
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "false");
});
