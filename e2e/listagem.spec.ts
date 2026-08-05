import { expect, test } from "@playwright/test";

import { cards } from "./locators";

/**
 * A listagem e um Server Component assincrono — o caminho principal do app e o
 * unico que o Vitest nao alcanca. Este arquivo absorve o antigo `smoke.spec.ts`:
 * o primeiro teste ja prova que o `webServer` sobe e que a pagina chega
 * renderizada, que era todo o papel dele.
 */

test("a home responde 200 com a listagem renderizada pelo servidor", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Pokedex" })).toBeVisible();
});

test("a primeira visita traz so a primeira fatia, e nao o catalogo inteiro", async ({ page }) => {
  await page.goto("/");

  await expect(cards(page)).toHaveCount(20);
});

test("o primeiro card e o bulbasaur, com a imagem de fato carregada", async ({ page }) => {
  await page.goto("/");

  const first = cards(page).first();
  await expect(first.getByRole("heading", { name: "Bulbasaur" })).toBeVisible();
  await expect(first.getByText("#0001")).toBeVisible();

  /*
    A imagem do card e decorativa (`alt=""`) de proposito, para o leitor de tela
    nao repetir o nome que o link ja anuncia — logo nao existe papel por onde
    consulta-la, e a busca por tag e o que resta.

    `naturalWidth` e nao "o `<img>` esta na pagina": um sprite bloqueado pelo
    `remotePatterns` renderiza o elemento do mesmo jeito e nao mostra nada.
  */
  const image = first.locator("img");
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
});

test("o contador anuncia o total do catalogo, e nao o tamanho da fatia", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Mostrando 20 de 100 pokemons")).toBeVisible();
});
