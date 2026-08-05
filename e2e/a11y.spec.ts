import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cards,
  focusRingWidth,
  listSize,
  loadMoreButton,
  searchInput,
  tabUntilFocused,
  typeFilter,
  waitForHydration,
} from "./locators";
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

test("o dropdown de tipos aberto nao tem violacao serious nem critical", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();

  // Estado que as rotas acima nao alcancam: o popover so existe depois do
  // clique, entao a auditoria dele precisa de um teste proprio.
  await typeFilter(page).click();
  await expect(page.getByRole("checkbox").first()).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const graves = violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );

  expect(
    graves.map((violation) => `${violation.impact} ${violation.id}: ${violation.nodes[0]?.html}`),
  ).toEqual([]);
});

test("Esc fecha o dropdown de tipos e devolve o foco ao gatilho", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();

  await typeFilter(page).click();
  await expect(page.getByRole("checkbox").first()).toBeVisible();
  expect(await focusRingWidth(page)).not.toBe("0px");

  await page.keyboard.press("Escape");

  // Perder o foco para o `body` ao fechar deixaria quem navega por teclado sem
  // lugar na pagina.
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(typeFilter(page)).toBeFocused();
});

test("os dois links de limpar filtros tem nomes acessiveis distintos", async ({ page }) => {
  await page.goto("/?q=zzzz");
  await expect(page.getByText("Nenhum pokemon encontrado")).toBeVisible();

  // Nome duplicado nao e violacao de WCAG, entao o axe nao pega: dois links com
  // o mesmo rotulo e o mesmo destino sao legais e, ainda assim, ilegiveis na
  // lista de links do leitor de tela.
  const nomes = await page
    .getByRole("link")
    .filter({ hasText: "Limpar filtros" })
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("aria-label") ?? link.textContent?.trim() ?? ""),
    );

  expect(nomes).toHaveLength(2);
  expect(new Set(nomes).size).toBe(2);
  // Criterio 2.5.3: os dois nomes comecam pelo texto que se le na tela, para
  // comando de voz continuar alcancando ambos.
  for (const nome of nomes) expect(nome).toContain("Limpar filtros");
});

test("o Tab do topo passa por busca, filtro, primeiro card e o gatilho, nessa ordem", async ({
  page,
}) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

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
  await expect.poll(() => listSize(page)).toBe(20);

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

  // Digitar antes de hidratar perde o evento: o React repoe o valor vazio no
  // commit e a busca nunca sai. O campo existir no DOM nao significa que ele ja
  // responde.
  await waitForHydration(page);
  await searchInput(page).fill("pikachu");

  await expect(live).toHaveText("1 pokemon encontrado");
});
