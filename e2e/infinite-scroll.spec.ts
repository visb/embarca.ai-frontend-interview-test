import { expect, test } from "@playwright/test";

import {
  announcedTotal,
  cards,
  listSize,
  loadMoreButton,
  scrollToMiddle,
  tabUntilFocused,
  typeFilter,
} from "./locators";
import { holdRequests, isSliceRequest } from "./network";

/**
 * Scroll infinito e o unico fluxo do app com estado acumulado no cliente. Os
 * riscos que ele carrega — perder o que foi carregado ao voltar do detalhe,
 * misturar conjuntos de filtros diferentes, rolar sem fim visivel — so aparecem
 * no browser, com o servidor real do outro lado.
 *
 * O que se conta aqui e `listSize`, e nao os cards no DOM: desde a grade
 * virtual, quantos cards estao montados e resposta sobre a janela de rolagem.
 * Quantos itens ja foram carregados continua sendo a garantia desta suite.
 */

test("rolar ate a base anexa uma fatia, e uma so", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await loadMoreButton(page).scrollIntoViewIfNeeded();

  // Sem segurar requisicao nenhuma: uma rolagem ate a base e uma fatia. O
  // sentinel so volta a disparar depois de reavaliar a ancora com o layout novo
  // assentado, entao a fatia que chega nao encadeia a seguinte sozinha.
  await expect.poll(() => listSize(page)).toBe(40);
  await expect(page).toHaveURL("/?page=2");

  // Segue valendo depois de a fatia assentar: a contagem nao escorrega sozinha.
  await expect.poll(() => listSize(page)).toBe(40);
});

test("cada rolagem ate a base avanca uma fatia, ate o fim da lista", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  for (const esperado of [40, 60, 80, 100]) {
    await loadMoreButton(page).scrollIntoViewIfNeeded();
    await expect.poll(() => listSize(page)).toBe(esperado);
  }

  await expect(loadMoreButton(page)).toBeHidden();
  await expect(page.getByText("100 de 100 pokemons")).toBeVisible();
});

test("tabular pelos cards nao carrega fatia nenhuma", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  // Tabular rola a pagina, e era isso que realimentava o ciclo: quem navega por
  // teclado recebia o catalogo inteiro sem ter pedido.
  await tabUntilFocused(page, cards(page).first().getByRole("link"));
  for (let press = 0; press < 10; press += 1) {
    await page.keyboard.press("Tab");
  }

  expect(await listSize(page)).toBe(20);
  await expect(page).toHaveURL("/");
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
        return listSize(page);
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
      aqui e o proprio ponto do teste: os 80 cards vieram do servidor, e sem JS
      nenhum deles e virtualizado.
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
  await expect.poll(() => listSize(page)).toBe(40);

  // Meio da lista: longe do topo (ha scroll para restaurar) e longe da base (o
  // sentinel nao dispara sozinho ao voltar). Sob a grade virtual o card do meio
  // so entra no DOM quando a rolagem chega perto dele — por isso a pagina rola
  // primeiro e o alvo e escolhido depois, entre os que estiverem montados.
  await scrollToMiddle(page);

  // O alvo e resolvido pelo nome, e nao por posicao: `first()` aponta para outro
  // elemento a cada linha que a rolagem desmonta.
  const nome = await cards(page).first().getByRole("link").getAttribute("aria-label");
  const target = page.getByRole("link", { name: nome ?? "" });

  // Encosta o alvo na viewport antes de medir: senao o clique rolaria a pagina
  // por conta propria e a posicao guardada nao seria a que o teste comparou.
  await target.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);

  await target.click();
  await expect(page).toHaveURL(/\/pokemon\//);

  await page.goBack();

  await expect.poll(() => listSize(page)).toBe(40);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore / 2);
});

test("filtrar depois de rolar reseta a lista sem misturar o conjunto anterior", async ({
  page,
}) => {
  await page.goto("/?page=2");
  await expect.poll(() => listSize(page)).toBe(40);

  await typeFilter(page).selectOption("fire");

  await expect(page).toHaveURL("/?type=fire");
  // Bulbasaur estava na tela e nao e do tipo fire: se sobrar, o que o filtro
  // fez foi somar, e nao trocar o conjunto.
  await expect(page.getByRole("heading", { name: "Bulbasaur" })).toBeHidden();

  const total = await announcedTotal(page);
  expect(total).toBeLessThanOrEqual(20);
  await expect.poll(() => listSize(page)).toBe(total);
});

test("o gatilho de carregar mais e alcancavel por Tab e o foco sobrevive ao anexar", async ({
  page,
}) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  // Tabular pelos cards rola a pagina e acorda o scroll infinito. Segurar a
  // fatia mantem a ordem de tabulacao parada enquanto ela e percorrida — e faz
  // do momento em que a fatia chega um evento controlado pelo teste.
  const release = await holdRequests(page, isSliceRequest);

  const button = loadMoreButton(page);
  await tabUntilFocused(page, button);
  await expect(button).toBeFocused();

  await page.keyboard.press("Enter");
  release();

  // O botao vive fora da janela virtual, entao anexar uma fatia nao o desmonta.
  await expect.poll(() => listSize(page)).toBeGreaterThan(20);
  // Ele tambem nao e desabilitado durante o carregamento, justamente para o foco
  // nao voltar ao `body` — quem navega por teclado perderia o lugar.
  await expect(button).toBeFocused();
});
