import { expect, test } from "@playwright/test";

/**
 * Metadata so existe de verdade no HTML entregue: `generateMetadata` roda no
 * servidor e nenhum teste de componente chega ate ele.
 */

test("a listagem entrega titulo e descricao preenchidos", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Pokedex/);

  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description?.trim()).toBeTruthy();
});

test("o detalhe titula com o nome do pokemon e compartilha imagem absoluta", async ({ page }) => {
  await page.goto("/pokemon/pikachu");

  await expect(page).toHaveTitle(/Pikachu/);

  // URL relativa em `og:image` nao falha o build: so gera link sem imagem.
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImage).toMatch(/^https?:\/\//);
});

test("a pagina declara o idioma do conteudo", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
});

test("sitemap e robots respondem e apontam para as rotas de detalhe", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/pokemon/pikachu");

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("sitemap.xml");
});
