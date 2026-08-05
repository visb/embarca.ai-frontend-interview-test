import { expect, test } from "@playwright/test";

import { announcedTotal, cards, loadMoreButton, tabUntilFocused, typeFilter } from "./locators";
import { allowOnly, holdRequests, isSliceRequest } from "./network";

/**
 * Scroll infinito e o unico fluxo do app com estado acumulado no cliente. Os
 * riscos que ele carrega — perder o que foi carregado ao voltar do detalhe,
 * misturar conjuntos de filtros diferentes, rolar sem fim visivel — so aparecem
 * no browser, com o servidor real do outro lado.
 */

test("rolar ate a base anexa a fatia seguinte e registra o cursor na URL", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(20);

  // Uma fatia so: a segunda fica segura no ar. Sem isso a fatia que chega deixa
  // a base visivel de novo e a terceira entra antes da assercao — o app esta
  // certo, mas o passo que este teste observa desaparece.
  await allowOnly(page, isSliceRequest, 1);

  await loadMoreButton(page).scrollIntoViewIfNeeded();

  await expect(cards(page)).toHaveCount(40);
  await expect(page).toHaveURL("/?page=2");
});

test("rolar ate o fim tira o gatilho da tela e anuncia o fim da lista", async ({ page }) => {
  await page.goto("/");
  const button = loadMoreButton(page);

  // Empurra o sentinel para a viewport enquanto houver o que carregar. Espera
  // por estado observavel (a lista completa), nao por tempo.
  await expect
    .poll(
      async () => {
        if (await button.isVisible()) await button.scrollIntoViewIfNeeded();
        return cards(page).count();
      },
      { timeout: 30_000 },
    )
    .toBe(100);

  await expect(button).toBeHidden();
  await expect(page.getByText("100 de 100 pokemons")).toBeVisible();
});

test.describe("sem javascript no cliente", () => {
  test.use({ javaScriptEnabled: false });

  test("a URL com fatia avancada ja chega com os cards no HTML", async ({ page }) => {
    await page.goto("/?page=4");

    /*
      Sem JS o conteudo em streaming continua no HTML, mas dentro do `<div
      hidden>` que o React usaria para move-lo ao lugar — fora da arvore de
      acessibilidade, e portanto fora do alcance de `getByRole`. A busca por tag
      aqui e o proprio ponto do teste: os 80 cards vieram do servidor.
    */
    await expect(page.locator("article")).toHaveCount(80);
    await expect(page.locator("article").first()).toContainText("Bulbasaur");
  });
});

/*
  Os dois testes abaixo partem de `/?page=2` em vez de rolar ate la: o cursor da
  URL entrega as mesmas duas fatias renderizadas pelo servidor, sem deixar uma
  fatia em voo disputando a URL com a navegacao seguinte. Que rolar produz esse
  `?page=2` ja esta provado nos testes acima.
*/

test("voltar do detalhe mantem a quantidade carregada e a posicao de scroll", async ({ page }) => {
  await page.goto("/?page=2");
  await expect(cards(page)).toHaveCount(40);

  // Card do meio da segunda fatia: longe do topo (ha scroll para restaurar) e
  // longe da base (o sentinel nao dispara sozinho ao voltar).
  const target = cards(page).nth(20);
  await target.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);

  await target.getByRole("link").click();
  await expect(page).toHaveURL(/\/pokemon\//);

  await page.goBack();

  await expect(cards(page)).toHaveCount(40);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore / 2);
});

test("filtrar depois de rolar reseta a lista sem misturar o conjunto anterior", async ({
  page,
}) => {
  await page.goto("/?page=2");
  await expect(cards(page)).toHaveCount(40);

  await typeFilter(page).selectOption("fire");

  await expect(page).toHaveURL("/?type=fire");
  // Bulbasaur estava na tela e nao e do tipo fire: se sobrar, o que o filtro
  // fez foi somar, e nao trocar o conjunto.
  await expect(page.getByRole("heading", { name: "Bulbasaur" })).toBeHidden();

  const total = await announcedTotal(page);
  expect(total).toBeLessThanOrEqual(20);
  await expect(cards(page)).toHaveCount(total);
});

test("o gatilho de carregar mais e alcancavel por Tab e o foco sobrevive ao anexar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(20);

  // Tabular pelos cards rola a pagina e acorda o scroll infinito. Segurar a
  // fatia mantem a ordem de tabulacao parada enquanto ela e percorrida — e faz
  // do momento em que a fatia chega um evento controlado pelo teste.
  const release = await holdRequests(page, isSliceRequest);

  const button = loadMoreButton(page);
  await tabUntilFocused(page, button);
  await expect(button).toBeFocused();

  const before = await cards(page).count();
  await page.keyboard.press("Enter");
  release();

  await expect.poll(() => cards(page).count()).toBeGreaterThan(before);
  // O botao nao e desabilitado durante o carregamento justamente para o foco
  // nao voltar ao `body` — quem navega por teclado perderia o lugar.
  await expect(button).toBeFocused();
});
