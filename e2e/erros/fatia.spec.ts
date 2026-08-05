import { expect, test } from "@playwright/test";

import { BASE_URLS } from "../base-urls";
import { cards, loadMoreButton } from "../locators";

/**
 * Fatia que falha no meio do scroll.
 *
 * Aqui o app e o do caminho feliz: quem precisa falhar e a server action, e ela
 * e o unico POST que sai do browser para o servidor Next — o que a coloca, ao
 * contrario do I/O com a PokeAPI, ao alcance do `page.route`.
 */
test.use({ baseURL: BASE_URLS.app });

test("fatia que falha preserva os cards ja carregados e oferece nova tentativa", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(20);

  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 500, body: "erro encenado na server action" });
      return;
    }
    await route.continue();
  });

  await loadMoreButton(page).click();

  await expect(page.getByText("Nao foi possivel carregar mais pokemons.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  // Falha de fatia nao pode custar o que ja estava na tela.
  await expect(cards(page)).toHaveCount(20);

  await page.unroute("**/*");
  await page.getByRole("button", { name: "Tentar novamente" }).click();

  await expect.poll(() => cards(page).count()).toBeGreaterThanOrEqual(40);
});
