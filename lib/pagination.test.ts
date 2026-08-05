import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { PER_PAGE, paginate, paginateCumulative } from "@/lib/pagination";

/** Lista de inteiros 1..n — o valor de cada item identifica sua posicao. */
const range = (n: number) => Array.from({ length: n }, (_, index) => index + 1);

describe("paginate", () => {
  test("100 itens rendem 5 paginas", () => {
    expect(paginate(range(100), 1)).toMatchObject({ totalPages: 5, total: 100, perPage: PER_PAGE });
  });

  test("a primeira pagina traz os 20 primeiros itens", () => {
    const result = paginate(range(100), 1);

    expect(result.items).toEqual(range(20));
    expect(result.hasMore).toBe(true);
  });

  test("a ultima pagina traz os itens 81 a 100 e encerra a lista", () => {
    const result = paginate(range(100), 5);

    expect(result.items[0]).toBe(81);
    expect(result.items.at(-1)).toBe(100);
    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(false);
  });

  test("pagina 0 vira a primeira pagina em vez de lista vazia", () => {
    expect(paginate(range(100), 0).page).toBe(1);
  });

  test("pagina negativa vira a primeira pagina", () => {
    expect(paginate(range(100), -3).page).toBe(1);
  });

  test("pagina acima do total cai na ultima pagina existente", () => {
    const result = paginate(range(100), 99);

    expect(result.page).toBe(5);
    expect(result.items).toEqual(range(100).slice(80));
  });

  test("lista vazia ainda tem uma pagina, sem itens e sem continuacao", () => {
    expect(paginate([], 1)).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      perPage: PER_PAGE,
      hasMore: false,
    });
  });

  test("resto nao exato deixa a ultima pagina menor", () => {
    expect(paginate(range(43), 1).totalPages).toBe(3);
    expect(paginate(range(43), 3).items).toEqual([41, 42, 43]);
  });

  test("respeita um tamanho de pagina customizado", () => {
    const result = paginate(range(10), 2, 3);

    expect(result.items).toEqual([4, 5, 6]);
    expect(result.totalPages).toBe(4);
  });
});

describe("paginateCumulative", () => {
  test("pagina 4 acumula as quatro fatias, nao so a quarta", () => {
    const result = paginateCumulative(range(100), 4);

    expect(result.items).toEqual(range(80));
    expect(result.hasMore).toBe(true);
  });

  test("pagina acima do total acumula tudo e encerra a lista", () => {
    const result = paginateCumulative(range(100), 99);

    expect(result.items).toHaveLength(100);
    expect(result.hasMore).toBe(false);
  });

  test("conjunto menor que uma fatia devolve tudo e encerra na primeira pagina", () => {
    const result = paginateCumulative(range(23), 2);

    expect(result.items).toEqual(range(23));
    expect(result.page).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  test("a primeira pagina de um conjunto maior ainda tem continuacao", () => {
    const result = paginateCumulative(range(23), 1);

    expect(result.items).toEqual(range(20));
    expect(result.hasMore).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Propriedades                                                                */
/* -------------------------------------------------------------------------- */

const itemsArb = fc.array(fc.integer(), { maxLength: 120 });
const pageArb = fc.integer({ min: -10, max: 30 });
const perPageArb = fc.integer({ min: 1, max: 25 });

describe("propriedades de paginate", () => {
  test("concatenar todas as paginas reconstroi a lista, sem buraco e sem repeticao", () => {
    fc.assert(
      fc.property(itemsArb, perPageArb, (items, perPage) => {
        const { totalPages } = paginate(items, 1, perPage);

        const rebuilt = range(totalPages).flatMap((page) => paginate(items, page, perPage).items);

        expect(rebuilt).toEqual(items);
      }),
    );
  });

  test("a pagina devolvida esta sempre dentro do intervalo valido", () => {
    fc.assert(
      fc.property(itemsArb, pageArb, perPageArb, (items, page, perPage) => {
        const result = paginate(items, page, perPage);

        expect(result.page).toBeGreaterThanOrEqual(1);
        expect(result.page).toBeLessThanOrEqual(result.totalPages);
      }),
    );
  });

  test("uma pagina nunca traz mais itens do que o tamanho de pagina", () => {
    fc.assert(
      fc.property(itemsArb, pageArb, perPageArb, (items, page, perPage) => {
        expect(paginate(items, page, perPage).items.length).toBeLessThanOrEqual(perPage);
      }),
    );
  });
});

describe("propriedades de paginateCumulative", () => {
  test("o acumulado de uma pagina e sempre prefixo do acumulado da seguinte", () => {
    fc.assert(
      fc.property(itemsArb, fc.integer({ min: 1, max: 20 }), perPageArb, (items, page, perPage) => {
        const current = paginateCumulative(items, page, perPage).items;
        const next = paginateCumulative(items, page + 1, perPage).items;

        expect(next.slice(0, current.length)).toEqual(current);
      }),
    );
  });

  test("nao ter mais o que carregar equivale a ja ter devolvido tudo", () => {
    fc.assert(
      fc.property(itemsArb, pageArb, perPageArb, (items, page, perPage) => {
        const result = paginateCumulative(items, page, perPage);

        expect(result.hasMore).toBe(result.items.length < items.length);
      }),
    );
  });
});
