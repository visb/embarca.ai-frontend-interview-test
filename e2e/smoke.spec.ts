import { expect, test } from "@playwright/test";

/**
 * Smoke da infra: prova que o `webServer` sobe o app e que a listagem — um
 * Server Component assincrono, fora do alcance do Vitest — chega renderizada.
 */
test("a listagem responde 200 e renderiza o titulo", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Pokedex" })).toBeVisible();
});
