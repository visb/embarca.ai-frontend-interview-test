import { expect, test } from "@playwright/test";

import { cards, searchInput, typeFilter } from "./locators";
import { UNKNOWN_NAME } from "./mock-api/fixtures";

test("clicar no card leva ao detalhe com habilidades e movimentos", async ({ page }) => {
  await page.goto("/?q=pikachu");

  await cards(page).first().getByRole("link").click();

  await expect(page).toHaveURL("/pokemon/pikachu?q=pikachu");
  await expect(page.getByRole("heading", { level: 1, name: "Pikachu" })).toBeVisible();
  await expect(page.getByText("0.4 m")).toBeVisible();
  await expect(page.getByText("6.0 kg")).toBeVisible();

  const habilidades = page.getByRole("region", { name: "Habilidades" });
  await expect(habilidades.getByText("Static")).toBeVisible();
  await expect(habilidades.getByText("oculta")).toBeVisible();

  // Requisito de "ate 5 movimentos": o corte tem que aparecer na tela, nao so
  // no mapeamento.
  const movimentos = page.getByRole("region", { name: "Movimentos" });
  await expect(movimentos.getByRole("listitem")).toHaveCount(5);
});

test("voltar do detalhe preserva a busca e o tipo da listagem de origem", async ({ page }) => {
  await page.goto("/?q=char&type=fire");

  await page.getByRole("link", { name: "Charizard, numero 6" }).click();
  await expect(page).toHaveURL("/pokemon/charizard?q=char&type=fire");

  await page.getByRole("link", { name: "Voltar para a listagem" }).click();

  await expect(page).toHaveURL("/?q=char&type=fire");
  await expect(searchInput(page)).toHaveValue("char");
  await expect(typeFilter(page)).toHaveText(/fire/);
});

test("nome inexistente mostra a pagina de nao encontrado", async ({ page }) => {
  await page.goto(`/pokemon/${UNKNOWN_NAME}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Pokemon nao encontrado" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar para a listagem" })).toBeVisible();

  // A UI de erro tem "Tentar novamente"; a de nao-encontrado nao. Sem esta
  // assercao o teste passaria verde com a pagina errada na tela.
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeHidden();
});

test("o link de voltar da pagina de nao encontrado leva a listagem", async ({ page }) => {
  await page.goto(`/pokemon/${UNKNOWN_NAME}`);

  await page.getByRole("link", { name: "Voltar para a listagem" }).click();

  await expect(page).toHaveURL("/");
  await expect(cards(page).first()).toBeVisible();
});
