import { expect, test, type Page } from "@playwright/test";

import {
  announcedTotal,
  cards,
  listSize,
  resultsArea,
  searchInput,
  selectTypes,
  typeFilter,
  typeOption,
} from "./locators";
import { holdRequests, isFilterNavigation } from "./network";

/**
 * O que prova o filtro nao e a grade encolher — e *todo* card que sobrou
 * carregar o badge de um dos tipos escolhidos. Contagem crua passaria verde num
 * filtro que corta a lista pelo criterio errado.
 */

test("filtrar por tipo deixa na tela apenas cards com aquele badge", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await selectTypes(page, ["fire"]);

  await expect(page).toHaveURL("/?type=fire");

  // O total anunciado e o proprio criterio da contagem: se a UI disser 3 e
  // renderizar 4, a divergencia aparece aqui em vez de passar batida.
  const total = await announcedTotal(page);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThan(100);
  await expect(cards(page)).toHaveCount(total);

  for (let index = 0; index < total; index += 1) {
    await expect(cards(page).nth(index).getByText("fire", { exact: true })).toBeVisible();
  }
});

test("dois tipos marcados sao uniao: todo card tem um badge ou o outro", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await selectTypes(page, ["fire"]);
  await expect(page).toHaveURL("/?type=fire");
  const somenteFire = await announcedTotal(page);

  await selectTypes(page, ["water"]);
  await expect(page).toHaveURL("/?type=fire,water");

  const total = await announcedTotal(page);
  // Marcar mais amplia — se reduzisse, o filtro seria intersecao com uma UI que
  // promete o contrario.
  expect(total).toBeGreaterThan(somenteFire);
  await expect(cards(page)).toHaveCount(total);

  const vazados = await cards(page).evaluateAll(
    (elementos) =>
      elementos.filter((elemento) => {
        const badges = [...elemento.querySelectorAll("li")].map((li) => li.textContent?.trim());
        return !badges.includes("fire") && !badges.includes("water");
      }).length,
  );

  expect(vazados).toBe(0);
});

test("cada caixa marcada recarrega a lista com o dropdown ainda aberto", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => listSize(page)).toBe(20);

  await typeFilter(page).click();

  await typeOption(page, "fire").click();
  await expect(page).toHaveURL("/?type=fire");
  // O dropdown nao fecha ao navegar: quem esta marcando continua marcando, e ve
  // o efeito de cada escolha em vez de descobrir tudo no fim.
  await expect(typeOption(page, "water")).toBeVisible();

  await typeOption(page, "water").click();
  await expect(page).toHaveURL("/?type=fire,water");
  await expect(typeOption(page, "fire")).toBeChecked();
  await expect(typeOption(page, "water")).toBeChecked();

  await page.keyboard.press("Escape");
  await expect(typeFilter(page)).toHaveText(/fire, water/);
});

test("limpar tipos dentro do dropdown restaura a lista completa na hora", async ({ page }) => {
  await page.goto("/?type=fire,water");
  await expect(cards(page).first()).toBeVisible();

  await typeFilter(page).click();
  await page.getByRole("button", { name: "Limpar tipos" }).click();

  await expect(page).toHaveURL("/");
  await expect(typeOption(page, "fire")).not.toBeChecked();
  await expect.poll(() => listSize(page)).toBe(20);
});

/**
 * Tipos oferecidos pelo filtro.
 *
 * A barra chega em streaming, entao a espera pelo gatilho visivel vem antes:
 * sem ela a leitura pega o dropdown ainda inexistente.
 */
async function offeredTypes(page: Page): Promise<string[]> {
  await expect(typeFilter(page)).toBeVisible();

  await typeFilter(page).click();
  // O nome do tipo esta no `<label>` ao lado; o `id` da caixa e o mesmo dado,
  // legivel sem depender de como o rotulo foi associado.
  const tipos = await page
    .getByRole("checkbox")
    .evaluateAll((boxes) => boxes.map((box) => box.id.replace(/^type-/, "")));
  await page.keyboard.press("Escape");

  return tipos;
}

test("o filtro nao oferece tipo que nenhum pokemon do catalogo tem", async ({ page }) => {
  await page.goto("/");

  const tipos = await offeredTypes(page);

  // `stellar` (geracao 9), `unknown` e `shadow` existem no `GET /type` e nao
  // pertencem a nenhum dos 100 primeiros: no dropdown seriam caixa morta.
  expect(tipos).not.toContain("stellar");
  expect(tipos).not.toContain("unknown");
  expect(tipos).not.toContain("shadow");
  expect(tipos).toEqual(expect.arrayContaining(["fire", "water", "grass", "electric"]));
});

test("nenhuma opcao do filtro leva ao estado vazio sozinha", async ({ page }) => {
  await page.goto("/");

  const tipos = await offeredTypes(page);
  expect(tipos.length).toBeGreaterThan(0);

  // A generalizacao da story 21: e este teste que pega a proxima geracao de
  // tipos antes do usuario, em vez de alguem descobrir por acaso.
  for (const tipo of tipos) {
    await page.goto(`/?type=${tipo}`);
    await expect(cards(page).first()).toBeVisible();
  }
});

test("tipo desconhecido colado na URL nao filtra, em vez de esvaziar a lista", async ({ page }) => {
  await page.goto("/?type=stellar");

  // Mesmo contrato de `?type=banana`: o param nao bate com nenhum tipo real e e
  // ignorado. Antes de a lista ser estreitada, `stellar` era "valido" e caia no
  // estado vazio.
  await expect.poll(() => listSize(page)).toBe(20);
  await expect(typeFilter(page)).toHaveText(/Todos os tipos/);
  await expect(page.getByText("Nenhum pokemon encontrado")).toBeHidden();
});

test("busca e tipo se cruzam em vez de um substituir o outro", async ({ page }) => {
  await page.goto("/?q=char&type=fire");

  await expect(cards(page)).toHaveCount(3);
  for (const name of ["Charmander", "Charmeleon", "Charizard"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
});

test("busca cruza com varios tipos: nome E (tipo OU tipo)", async ({ page }) => {
  await page.goto("/?q=char&type=fire,water");

  // `char` bate os tres charmanders (fire); squirtle e water mas nao bate o
  // nome. Sao dois niveis de combinacao diferentes e deliberados.
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Squirtle" })).toBeHidden();
});

test("URL colada fora da ordem canonica renderiza o mesmo estado", async ({ page }) => {
  await page.goto("/?type=water,fire");

  await expect(typeFilter(page)).toHaveText(/fire, water/);

  await typeFilter(page).click();
  await expect(typeOption(page, "fire")).toBeChecked();
  await expect(typeOption(page, "water")).toBeChecked();
  await expect(typeOption(page, "grass")).not.toBeChecked();
});

test("combinacao impossivel cai no estado vazio, e limpar restaura a lista", async ({ page }) => {
  await page.goto("/?q=pikachu&type=water,rock");

  await expect(page.getByText("Nenhum pokemon encontrado")).toBeVisible();
  await expect(page.getByText('Nada combina com "pikachu" nos tipos rock, water.')).toBeVisible();

  // Os dois links que levam a listagem limpa tem nomes distintos, entao o teste
  // volta a dizer *qual* deles foi exercitado: este e o do estado vazio.
  await page.getByRole("link", { name: "Limpar filtros e ver a lista completa" }).click();

  await expect(page).toHaveURL("/");
  await expect.poll(() => listSize(page)).toBe(20);
});

test("o limpar da barra de filtros tambem restaura a lista", async ({ page }) => {
  await page.goto("/?q=pikachu&type=water");
  await expect(page.getByText("Nenhum pokemon encontrado")).toBeVisible();

  // `exact` para nao casar com o nome estendido do estado vazio — os dois
  // funcionam, e e o teste que passa a distinguir.
  await page.getByRole("link", { name: "Limpar filtros", exact: true }).click();

  await expect(page).toHaveURL("/");
  await expect.poll(() => listSize(page)).toBe(20);
});

test("limpar filtros zera os controles na hora e avisa que a lista recarrega", async ({ page }) => {
  await page.goto("/?q=char&type=fire");
  await expect(searchInput(page)).toHaveValue("char");
  await expect(typeFilter(page)).toHaveText(/fire/);

  // Segura a navegacao para o intervalo "limpou, mas o servidor ainda nao
  // respondeu" ficar parado enquanto as assercoes rodam. E justamente esse
  // intervalo em que a tela parecia travada.
  const release = await holdRequests(page, isFilterNavigation);

  await page.getByRole("link", { name: "Limpar filtros" }).click();

  // A URL ainda e a filtrada — a transicao a segura —, e mesmo assim os
  // controles ja mostram o estado escolhido.
  await expect(searchInput(page)).toHaveValue("");
  await expect(typeFilter(page)).toHaveText(/Todos os tipos/);
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "true");

  release();

  await expect(page).toHaveURL("/");
  await expect(resultsArea(page)).toHaveAttribute("aria-busy", "false");
  await expect.poll(() => listSize(page)).toBe(20);
});

test("URL com busca, tipo e pagina colada direto renderiza o estado certo", async ({ page }) => {
  await page.goto("/?q=char&type=fire&page=2");

  // A fatia 2 nao existe num conjunto de 3, e pagina fora do intervalo e
  // clampada em vez de virar erro.
  await expect(cards(page)).toHaveCount(3);
  await expect(searchInput(page)).toHaveValue("char");
  await expect(typeFilter(page)).toHaveText(/fire/);
});

test("rolar com varios tipos marcados nao vaza item de outro tipo na fatia 2", async ({ page }) => {
  // Tres tipos do preenchimento do mock: juntos passam de uma fatia, que e o
  // que faz o scroll infinito entrar em cena com o filtro ativo.
  const escolhidos = ["normal", "ground", "water"];
  await page.goto(`/?type=${escolhidos.join(",")}`);
  await expect.poll(() => listSize(page)).toBe(20);

  await page.getByRole("button", { name: "Carregar mais" }).scrollIntoViewIfNeeded();
  await expect.poll(() => listSize(page)).toBeGreaterThan(20);

  // Leitura num passo so: sob virtualizacao, percorrer por indice com um `await`
  // por card deixa a rolagem desmontar a linha no meio da conferencia.
  const vazados = await cards(page).evaluateAll(
    (elementos, tipos) =>
      elementos.filter((elemento) => {
        const badges = [...elemento.querySelectorAll("li")].map((li) => li.textContent?.trim());
        return !badges.some((badge) => tipos.includes(badge ?? ""));
      }).length,
    escolhidos,
  );

  expect(await cards(page).count()).toBeGreaterThan(0);
  expect(vazados).toBe(0);
});
