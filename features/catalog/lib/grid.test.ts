import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { columnsForWidth, GRID_BREAKPOINTS } from "@/features/catalog/lib/grid";

describe("columnsForWidth", () => {
  /*
    As bordas sao o proprio contrato: os breakpoints tem que cair no mesmo lugar
    que as media queries do Tailwind (`sm:grid-cols-2 lg:grid-cols-3
    xl:grid-cols-4`), senao o modo virtual monta uma grade diferente da que o
    servidor mandou e os cards saltam ao hidratar.
  */
  test.for([
    [320, 1],
    [GRID_BREAKPOINTS.sm - 1, 1],
    [GRID_BREAKPOINTS.sm, 2],
    [GRID_BREAKPOINTS.lg - 1, 2],
    [GRID_BREAKPOINTS.lg, 3],
    [GRID_BREAKPOINTS.xl - 1, 3],
    [GRID_BREAKPOINTS.xl, 4],
  ] as const)("largura %i cabe %i colunas", ([width, expected]) => {
    expect(columnsForWidth(width)).toBe(expected);
  });

  test("largura 0 ainda vale 1 coluna", () => {
    // Antes da primeira medicao a largura chega 0, e o `rowCount` do virtualizer
    // divide por este numero: devolver 0 aqui viraria `Infinity` linhas.
    expect(columnsForWidth(0)).toBe(1);
  });

  test("nenhuma largura produz coluna fora de 1..4, nem fracionaria", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), (width) => {
        const columns = columnsForWidth(width);
        expect([1, 2, 3, 4]).toContain(columns);
      }),
    );
  });

  test("mais largura nunca devolve menos colunas", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (a, b) => {
          const [menor, maior] = a <= b ? [a, b] : [b, a];
          expect(columnsForWidth(menor)).toBeLessThanOrEqual(columnsForWidth(maior));
        },
      ),
    );
  });
});
