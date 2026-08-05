import { expect, test } from "@playwright/test";

import { BASE_URLS } from "../base-urls";

/**
 * Catalogo fora do ar.
 *
 * Roda contra um app proprio, que subiu com o mock ja em `MOCK_MODE=fail-catalog`
 * — o catalogo e cacheado com `cacheLife("max")`, entao derrubar a API depois de
 * um sucesso nao produziria erro nenhum: o cache responderia. Um teste assim no
 * meio da suite feliz provaria o cache, nao o erro.
 */
test.use({ baseURL: BASE_URLS.errorCatalogApp });

test("catalogo indisponivel mostra a UI de erro com nova tentativa", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Nao foi possivel carregar os pokemons" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});

test("a falha nao se disfarca de lista vazia", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();

  // "Nenhum pokemon encontrado" e "a API caiu" sao diagnosticos opostos: quem ve
  // o primeiro no lugar do segundo conclui que o filtro esta certo e desiste.
  await expect(page.getByText("Nenhum pokemon encontrado")).toBeHidden();
  await expect(page.getByRole("article")).toHaveCount(0);
});
