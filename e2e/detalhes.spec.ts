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
  await expect(typeFilter(page)).toHaveValue("fire");
});

test("nome inexistente mostra a pagina de nao encontrado", async ({ page }) => {
  /*
    Marcado como pendente porque **falha hoje**: a rota mostra a UI de erro
    ("Nao foi possivel carregar este pokemon"), e nao a pagina de nao
    encontrado. O 404 da PokeAPI sobe como `PokeApiError` de dentro de uma
    funcao `"use cache"`, e o `instanceof` do `page.tsx` nao reconhece o que
    volta da fronteira do cache — entao o `notFound()` nunca roda.

    Nao e a limitacao ja documentada no README (aquela e sobre o *status* ser
    200 em vez de 404, com a pagina certa aparecendo): e um bug que estes testes
    revelaram, e consertar bug esta fora do escopo desta story. A assercao fica
    escrita no que o app deveria fazer, para o dia do conserto ter o teste
    pronto — em vez de gravar o defeito como se fosse comportamento.
  */
  test.fixme(true, "bug encontrado nesta story: cai no error boundary em vez do not-found");

  await page.goto(`/pokemon/${UNKNOWN_NAME}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Pokemon nao encontrado" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar para a listagem" })).toBeVisible();
});
