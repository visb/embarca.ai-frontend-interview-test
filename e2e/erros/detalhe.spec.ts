import { expect, test } from "@playwright/test";

import { BASE_URLS } from "../base-urls";
import { FAILING_DETAIL_NAME } from "../mock-api/fixtures";

/**
 * Detalhe fora do ar.
 *
 * App proprio, com o mock em `MOCK_MODE=fail-detail`: so o recurso de um
 * pokemon falha. O catalogo continua de pe de proposito — sem isso, o erro
 * provado seria o do catalogo com outra roupa.
 */
test.use({ baseURL: BASE_URLS.errorDetailApp });

test("detalhe indisponivel mostra a UI de erro com nova tentativa", async ({ page }) => {
  await page.goto(`/pokemon/${FAILING_DETAIL_NAME}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Nao foi possivel carregar este pokemon" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});

test("a listagem continua funcionando: quem falhou foi so o detalhe", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("article").first()).toBeVisible();
});
