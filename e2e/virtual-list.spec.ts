import { expect, test, type Page } from "@playwright/test";

import { cards, listSize, loadMoreButton, scrollToMiddle } from "./locators";
import { holdRequests, isSliceRequest } from "./network";

/**
 * Virtualizacao da grade.
 *
 * E aqui que ela e provada: o Vitest roda em jsdom, que nao tem layout — toda
 * altura medida sai 0 e o range do virtualizer nao significa nada la. So um
 * browser de verdade responde "quantos cards estao montados".
 *
 * O que estes testes garantem e **comportamento**, nao metrica: o DOM para de
 * crescer junto com a lista. Com 100 itens o ganho de performance e teorico, e a
 * story assume isso — nenhuma assercao aqui e uma meta de INP ou LCP.
 */

/** Nomes dos cards montados agora, na ordem do DOM. */
function mountedNames(page: Page): Promise<string[]> {
  return cards(page).getByRole("heading", { level: 2 }).allTextContents();
}

/** Rola meia tela e diz se ja estava na base. */
function scrollHalfScreen(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const reached = window.scrollY + window.innerHeight >= document.body.scrollHeight - 2;
    window.scrollBy(0, window.innerHeight / 2);
    return reached;
  });
}

/** Carrega o catalogo inteiro empurrando o sentinel para a viewport. */
async function loadEverything(page: Page): Promise<void> {
  const button = loadMoreButton(page);

  await expect
    .poll(
      async () => {
        if (await button.isVisible()) await button.scrollIntoViewIfNeeded();
        return listSize(page);
      },
      { timeout: 30_000 },
    )
    .toBe(100);
}

test("com a lista inteira carregada, o DOM tem menos cards do que a lista", async ({ page }) => {
  await page.goto("/");
  await loadEverything(page);

  // O caso que justifica a story: 100 itens carregados, DOM parcial.
  const montados = await cards(page).count();
  expect(montados).toBeGreaterThan(0);
  expect(montados).toBeLessThan(100);
});

test("rolar a lista nao faz o DOM crescer", async ({ page }) => {
  await page.goto("/");
  await loadEverything(page);
  await page.evaluate(() => window.scrollTo(0, 0));

  const noTopo = await cards(page).count();
  let maximo = 0;

  // O passo de rolagem mora dentro do `poll`: cada tentativa da ao virtualizer
  // o intervalo do proprio poll para reagir, sem espera por tempo fixo.
  await expect
    .poll(
      async () => {
        maximo = Math.max(maximo, await cards(page).count());
        return scrollHalfScreen(page);
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  // O DOM montado acompanha a janela, e nao a lista: nenhum ponto da rolagem
  // monta muito mais do que o topo ja montava.
  expect(maximo).toBeLessThan(100);
  expect(maximo).toBeLessThanOrEqual(noTopo * 2);
});

test("rolar do topo ao fim mostra os 100, sem buraco e sem repeticao", async ({ page }) => {
  // `?page=5` entrega o catalogo inteiro pelo servidor: o que se mede aqui e a
  // varredura da grade virtual, sem fatias chegando no meio dela.
  await page.goto("/?page=5");
  await expect.poll(() => listSize(page)).toBe(100);

  const vistos = new Set<string>();
  await expect
    .poll(
      async () => {
        for (const name of await mountedNames(page)) vistos.add(name);
        await scrollHalfScreen(page);
        return vistos.size;
      },
      { timeout: 30_000 },
    )
    .toBe(100);
});

test("as posicoes anunciadas cobrem a lista inteira, e nao o que esta montado", async ({
  page,
}) => {
  await page.goto("/?page=5");
  await expect.poll(() => listSize(page)).toBe(100);

  const primeiro = cards(page).first();
  await expect(primeiro).toHaveAttribute("aria-setsize", "100");
  await expect(primeiro).toHaveAttribute("aria-posinset", "1");

  // Rola ate o meio: e la que a diferenca aparece. Sem `aria-posinset` real, o
  // leitor de tela anunciaria "1 de 100" para o card que na verdade e o 60.
  await scrollToMiddle(page);

  const posicoes = await cards(page).evaluateAll((elements) =>
    elements.map((element) => Number(element.getAttribute("aria-posinset"))),
  );
  expect(posicoes).toEqual(posicoes.map((_, index) => posicoes[0] + index));
  await expect(cards(page).first()).toHaveAttribute("aria-setsize", "100");
});

test.describe("sem javascript no cliente", () => {
  test.use({ javaScriptEnabled: false });

  test("a fatia do servidor chega inteira, em lista de verdade", async ({ page }) => {
    await page.goto("/?page=2");

    /*
      Sem JS nada virtualiza: o virtualizer so assume depois de hidratar, e o
      HTML continua sendo o `<ul>/<li>` de sempre — e o que mantem a listagem
      legivel sem JS, como a story de SEO entregou.

      Busca por tag e por atributo, e nao por papel: sem JS o conteudo em
      streaming fica dentro do `<div hidden>` que o React usaria para move-lo ao
      lugar, fora da arvore de acessibilidade e portanto fora do `getByRole`.
    */
    await expect(page.locator("ul > li > article")).toHaveCount(40);
    await expect(page.locator("[role='listitem']")).toHaveCount(0);
  });
});

test("hidratar nao move os cards nem a rolagem", async ({ page }) => {
  /*
    Os chunks do cliente ficam presos ate a medicao terminar: e a janela em que
    o que esta na tela e exatamente o que o servidor mandou. Sem isso a
    hidratacao acontece antes da primeira medida e o teste compararia o modo
    virtual com ele mesmo.

    Os scripts *inline* do streaming nao passam por `page.route`, entao a grade
    chega ao lugar normalmente; o que fica retido e so o React.
  */
  const release = await holdRequests(page, (request) => request.resourceType() === "script");
  // `commit`: com os scripts presos o evento `load` nunca chegaria.
  await page.goto("/?page=2", { waitUntil: "commit" });

  const primeiro = page.getByRole("heading", { level: 2 }).first();
  await expect(primeiro).toBeVisible();
  const doServidor = await primeiro.boundingBox();

  release();

  // `aria-posinset` so existe no modo virtual: e o sinal de que o handoff acabou.
  await expect(cards(page).first()).toHaveAttribute("aria-posinset", "1");

  expect(await primeiro.boundingBox()).toEqual(doServidor);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("voltar do detalhe com a lista quase inteira devolve o mesmo lugar", async ({ page }) => {
  await page.goto("/?page=4");
  await expect.poll(() => listSize(page)).toBe(80);

  await scrollToMiddle(page);

  // Pelo nome, e nao por posicao: `first()` aponta para outro elemento a cada
  // linha que a rolagem desmonta.
  const nome = await cards(page).first().getByRole("link").getAttribute("aria-label");
  const alvo = page.getByRole("link", { name: nome ?? "" });

  await alvo.scrollIntoViewIfNeeded();
  const scrollAntes = await page.evaluate(() => window.scrollY);
  expect(scrollAntes).toBeGreaterThan(0);

  await alvo.click();
  await expect(page).toHaveURL(/\/pokemon\//);

  await page.goBack();

  await expect.poll(() => listSize(page)).toBe(80);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollAntes / 2);
  // O card de onde se saiu volta montado: a posicao restaurada e a mesma, e nao
  // apenas "algum lugar com scroll".
  await expect(alvo).toBeVisible();
});

test("redimensionar recalcula as colunas sem duplicar nem perder card", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto("/?page=2");
  await expect.poll(() => listSize(page)).toBe(40);

  /**
   * Colunas que o Tailwind aplicaria nesta largura — as mesmas media queries que
   * o `PokemonGrid` usa. Compara-las com o que a grade virtual montou e o que
   * prova que o JS (agora a fonte da verdade) nao divergiu do CSS.
   */
  const expectedColumns = () =>
    page.evaluate(() => {
      if (matchMedia("(min-width: 1280px)").matches) return 4;
      if (matchMedia("(min-width: 1024px)").matches) return 3;
      if (matchMedia("(min-width: 640px)").matches) return 2;
      return 1;
    });

  /** Cards que dividem a primeira linha montada: mesma coordenada vertical. */
  const columnsInFirstRow = async () => {
    const tops = await cards(page).evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().top)),
    );
    return tops.filter((top) => top === tops[0]).length;
  };

  expect(await expectedColumns()).toBe(1);
  await expect.poll(columnsInFirstRow).toBe(1);

  await page.setViewportSize({ width: 1280, height: 720 });

  await expect.poll(columnsInFirstRow).toBe(await expectedColumns());
  // Recompor as linhas nao pode inventar nem sumir com item.
  await expect.poll(() => listSize(page)).toBe(40);
  const nomes = await mountedNames(page);
  expect(new Set(nomes).size).toBe(nomes.length);
});

test("tabular pela lista nao perde o foco quando as linhas desmontam", async ({ page }) => {
  test.slow();

  // Fatia congelada: o que se observa aqui e o foco atravessando a janela
  // virtual, e nao o scroll infinito anexando itens no meio do caminho.
  const release = await holdRequests(page, isSliceRequest);
  await page.goto("/?page=3");
  await expect.poll(() => listSize(page)).toBe(60);

  const button = loadMoreButton(page);
  const activeTag = () => page.evaluate(() => document.activeElement?.tagName);

  for (let press = 0; press < 150; press += 1) {
    await page.keyboard.press("Tab");

    // Tabular rola a pagina, e o virtualizer desmonta as linhas que ficaram para
    // tras. Se desmontasse a linha que tem o foco, o `activeElement` voltaria
    // para o `body` e quem navega por teclado perderia o lugar na lista.
    expect(await activeTag()).not.toBe("BODY");

    if (await button.evaluate((element) => element === document.activeElement)) break;
  }

  // O gatilho vive depois do container virtual: nenhuma linha desmontada pode
  // tira-lo da ordem de tabulacao.
  await expect(button).toBeFocused();
  release();
});
