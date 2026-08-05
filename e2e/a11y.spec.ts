import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { cards, focusRingWidth, loadMoreButton, searchInput, tabUntilFocused } from "./locators";
import { holdRequests, isSliceRequest } from "./network";

/**
 * Auditoria automatizada mais os fluxos de teclado.
 *
 * O axe pega contraste, rotulo e estrutura; nao pega ordem logica de foco nem
 * se o Enter faz o que o usuario espera. Por isso as duas metades convivem aqui.
 */

interface Route {
  path: string;
  /** O que precisa estar na tela antes de auditar — a grade chega em streaming. */
  settled: (page: Page) => Locator;
}

const ROUTES: Route[] = [
  { path: "/", settled: (page) => cards(page).first() },
  { path: "/?q=zzzz", settled: (page) => page.getByText("Nenhum pokemon encontrado") },
  { path: "/?type=fire", settled: (page) => cards(page).first() },
  {
    path: "/pokemon/pikachu",
    settled: (page) => page.getByRole("heading", { level: 1, name: "Pikachu" }),
  },
];

for (const route of ROUTES) {
  test(`${route.path} nao tem violacao serious nem critical`, async ({ page }) => {
    await page.goto(route.path);
    await expect(route.settled(page)).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).analyze();
    const graves = violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    // Mensagem com o id da regra e o alvo: uma contagem sozinha nao diz o que arrumar.
    expect(
      graves.map((violation) => `${violation.impact} ${violation.id}: ${violation.nodes[0]?.html}`),
    ).toEqual([]);
  });
}

test("o Tab do topo passa por busca, filtro, primeiro card e o gatilho, nessa ordem", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(20);

  // Tabular pelos cards rola a pagina e acorda o scroll infinito: sem segurar a
  // fatia, a ordem mudaria durante a propria conferencia da ordem.
  const release = await holdRequests(page, isSliceRequest);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteudo" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(searchInput(page)).toBeFocused();
  expect(await focusRingWidth(page)).not.toBe("0px");

  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Filtrar por tipo")).toBeFocused();
  expect(await focusRingWidth(page)).not.toBe("0px");

  await page.keyboard.press("Tab");
  const firstCardLink = cards(page).first().getByRole("link");
  await expect(firstCardLink).toBeFocused();
  expect(await focusRingWidth(page)).not.toBe("0px");

  // O gatilho do scroll infinito precisa ser alcancavel: quem navega por teclado
  // nunca gera evento de rolagem.
  await tabUntilFocused(page, loadMoreButton(page));
  await expect(loadMoreButton(page)).toBeFocused();

  release();
});

test("Enter no card navega para o detalhe", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(20);

  await tabUntilFocused(page, cards(page).first().getByRole("link"));
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("/pokemon/bulbasaur");
  await expect(page.getByRole("heading", { level: 1, name: "Bulbasaur" })).toBeVisible();
});

test("o novo total e anunciado numa regiao viva depois da busca", async ({ page }) => {
  await page.goto("/");

  // Sem papel proprio: `aria-live` e atributo. E justamente o atributo que faz o
  // leitor de tela perceber o filtro agindo sem recarregar a pagina.
  const live = page.locator("[aria-live='polite']");
  await expect(live).toHaveText("Mostrando 20 de 100 pokemons");

  await searchInput(page).fill("pikachu");

  await expect(live).toHaveText("1 pokemon encontrado");
});
