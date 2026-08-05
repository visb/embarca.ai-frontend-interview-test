import { expect, test } from "@playwright/test";

import { announcedTotal, cards, listSize, resultsArea, searchInput, typeFilter } from "./locators";
import { holdRequests, isFilterNavigation } from "./network";

/**
 * O que prova o filtro nao e a grade encolher — e *todo* card que sobrou
 * carregar o badge do tipo escolhido. Contagem crua passaria verde num filtro
 * que corta a lista pelo criterio errado.
 */

test("filtrar por tipo deixa na tela apenas cards com aquele badge", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await typeFilter(page).selectOption("fire");

  await expect(page).toHaveURL("/?type=fire");

  // O total anunciado e o proprio criterio da contagem: se a UI disser 3 e
  // renderizar 4, a divergencia aparece aqui em vez de passar batida.
  const total = await announcedTotal(page);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThan(100);
  await expect(cards(page)).toHaveCount(total);

  for (let index = 0; index < total; index += 1) {
    await expect(cards(page).nth(index).getByText("fire", { exact: true })).toBeVisible();
  }
});

test("busca e tipo se cruzam em vez de um substituir o outro", async ({ page }) => {
  await page.goto("/?q=char&type=fire");

  await expect(cards(page)).toHaveCount(3);
  for (const name of ["Charmander", "Charmeleon", "Charizard"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
});

test("combinacao impossivel cai no estado vazio, e limpar restaura a lista", async ({ page }) => {
  await page.goto("/?q=pikachu&type=water");

  await expect(page.getByText("Nenhum pokemon encontrado")).toBeVisible();
  await expect(page.getByText('Nada combina com "pikachu" no tipo water.')).toBeVisible();

  // Dois links com o mesmo nome levam a listagem limpa: o da barra de filtros e
  // o do estado vazio. Qualquer um serve para provar que a lista volta inteira.
  await page.getByRole("link", { name: "Limpar filtros" }).first().click();

  await expect(page).toHaveURL("/");
  await expect.poll(() => listSize(page)).toBe(20);
});

test("limpar filtros zera os controles na hora e avisa que a lista recarrega", async ({ page }) => {
  await page.goto("/?q=char&type=fire");
  await expect(searchInput(page)).toHaveValue("char");
  await expect(typeFilter(page)).toHaveValue("fire");

  // Segura a navegacao para o intervalo "limpou, mas o servidor ainda nao
  // respondeu" ficar parado enquanto as assercoes rodam. E justamente esse
  // intervalo em que a tela parecia travada.
  const release = await holdRequests(page, isFilterNavigation);

  await page.getByRole("link", { name: "Limpar filtros" }).click();

  // A URL ainda e a filtrada — a transicao a segura —, e mesmo assim os
  // controles ja mostram o estado escolhido.
  await expect(searchInput(page)).toHaveValue("");
  await expect(typeFilter(page)).toHaveValue("");
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "true");

  release();

  await expect(page).toHaveURL("/");
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "false");
  await expect.poll(() => listSize(page)).toBe(20);
});

test("URL com busca, tipo e pagina colada direto renderiza o estado certo", async ({ page }) => {
  await page.goto("/?q=char&type=fire&page=2");

  // A fatia 2 nao existe num conjunto de 3, e pagina fora do intervalo e
  // clampada em vez de virar erro.
  await expect(cards(page)).toHaveCount(3);
  await expect(searchInput(page)).toHaveValue("char");
  await expect(typeFilter(page)).toHaveValue("fire");
});
