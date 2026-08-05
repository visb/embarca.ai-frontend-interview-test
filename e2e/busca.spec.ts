import { expect, test } from "@playwright/test";

import { IS_LIVE } from "./base-urls";
import { cards, listSize, searchInput } from "./locators";

/**
 * A busca vive na URL: o que se prova aqui e que digitar, recarregar e colar um
 * link levam ao mesmo estado. Assercao sobre o que aparece e sobre a URL —
 * nunca sobre requisicao ou estado interno.
 */

test("digitar reduz a grade e leva o termo para a URL", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await searchInput(page).fill("pika");

  await expect(page).toHaveURL("/?q=pika");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first().getByRole("heading", { name: "Pikachu" })).toBeVisible();
});

test("recarregar preserva o filtro e o texto do campo", async ({ page }) => {
  await page.goto("/?q=pika");
  await expect(cards(page)).toHaveCount(1);

  await page.reload();

  await expect(searchInput(page)).toHaveValue("pika");
  await expect(cards(page)).toHaveCount(1);
});

test("termo sem resultado cai no estado vazio, e nao em erro", async ({ page }) => {
  await page.goto("/");

  await searchInput(page).fill("zzzz");

  await expect(page.getByText("Nenhum pokemon encontrado")).toBeVisible();
  await expect(page.getByText('Nada combina com "zzzz".')).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
});

test("buscar a partir de uma fatia avancada volta para a primeira fatia", async ({ page }) => {
  await page.goto("/?page=3");
  // Contagem pela lista logica: com a grade virtual, 60 itens carregados nao
  // sao 60 cards no DOM.
  await expect.poll(() => listSize(page)).toBe(60);

  // "e" aparece em bem mais de 20 nomes tanto no catalogo do mock quanto na
  // PokeAPI: o que importa e o conjunto novo ser maior que uma fatia.
  await searchInput(page).fill("e");

  await expect(page).toHaveURL("/?q=e");
  await expect.poll(() => listSize(page)).toBe(20);
});

test("a busca atravessa o hifen do nome", async ({ page }) => {
  test.skip(
    IS_LIVE,
    "mr-mime e o #122 da PokeAPI: existe na API real, mas fora do recorte de 100 do app",
  );

  await page.goto("/?q=mr");

  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first().getByRole("heading", { name: "Mr Mime" })).toBeVisible();
});
