import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { applyFilters, filterByType } from "@/lib/filters";
import { filterByName } from "@/lib/search";
import { makeSummary } from "@/test/fixtures/pokemon";

const bulbasaur = makeSummary({ id: 1, name: "bulbasaur", types: ["grass", "poison"] });
const charmander = makeSummary({ id: 4, name: "charmander", types: ["fire"] });
const squirtle = makeSummary({ id: 7, name: "squirtle", types: ["water"] });
const oddish = makeSummary({ id: 43, name: "oddish", types: ["grass", "poison"] });

const catalog = [bulbasaur, charmander, squirtle, oddish];

describe("filterByType", () => {
  test("tipo vazio devolve o catalogo intacto", () => {
    expect(filterByType(catalog, "")).toEqual(catalog);
    expect(filterByType(catalog, undefined)).toEqual(catalog);
  });

  test("pokemon de tipo duplo aparece na busca pelos dois tipos", () => {
    expect(filterByType(catalog, "grass")).toContain(bulbasaur);
    expect(filterByType(catalog, "poison")).toContain(bulbasaur);
  });

  test("filtra apenas quem tem o tipo pedido", () => {
    expect(filterByType(catalog, "fire")).toEqual([charmander]);
  });

  /**
   * Quem neutraliza `?type=banana` e o `parseTypeParam`, antes de chegar aqui —
   * ver `lib/search-params.test.ts`. Nesta funcao um tipo que ninguem possui e
   * so um filtro que nao casa com nada.
   */
  test("tipo que nenhum pokemon possui devolve lista vazia", () => {
    expect(filterByType(catalog, "banana")).toEqual([]);
  });
});

describe("applyFilters", () => {
  test("busca e tipo juntos sao intersecao, nao uniao", () => {
    const result = applyFilters(catalog, { q: "bulba", type: "grass" });

    expect(result).toEqual([bulbasaur]);
  });

  test("nada satisfaz os dois filtros ao mesmo tempo devolve vazio", () => {
    expect(applyFilters(catalog, { q: "bulba", type: "fire" })).toEqual([]);
  });

  test("sem filtro nenhum devolve o catalogo inteiro", () => {
    expect(applyFilters(catalog, {})).toEqual(catalog);
  });

  test("so a busca ignora o tipo", () => {
    expect(applyFilters(catalog, { q: "dish" })).toEqual([oddish]);
  });

  test("so o tipo ignora a busca", () => {
    expect(applyFilters(catalog, { type: "water" })).toEqual([squirtle]);
  });
});

/* -------------------------------------------------------------------------- */
/* Propriedades                                                                */
/* -------------------------------------------------------------------------- */

const typeArb = fc.constantFrom("grass", "poison", "fire", "water", "bug", "flying", "electric");

const itemArb = fc.record({
  name: fc.constantFrom(
    "pikachu",
    "raichu",
    "bulbasaur",
    "charmander",
    "mr-mime",
    "nidoran-f",
    "ekans",
    "arbok",
  ),
  types: fc.uniqueArray(typeArb, { minLength: 1, maxLength: 2 }),
});

const itemsArb = fc.array(itemArb, { maxLength: 30 });
const qArb = fc.constantFrom("", "   ", "pika", "chu", "mime", "an", "a", "zzz", "MR", "nidoranf");
const typeFilterArb = fc.option(typeArb, { nil: undefined });

describe("propriedades de applyFilters", () => {
  test("filtrar por nome e por tipo em qualquer ordem da o mesmo conjunto", () => {
    fc.assert(
      fc.property(itemsArb, qArb, typeFilterArb, (items, q, type) => {
        const nomeDepoisTipo = filterByName(filterByType(items, type), q);

        expect(applyFilters(items, { q, type })).toEqual(nomeDepoisTipo);
      }),
    );
  });

  test("o resultado e sempre um subconjunto da entrada, na mesma ordem", () => {
    fc.assert(
      fc.property(itemsArb, qArb, typeFilterArb, (items, q, type) => {
        const result = applyFilters(items, { q, type });

        expect(result.length).toBeLessThanOrEqual(items.length);
        // Subsequencia: percorrer a entrada uma unica vez cobre todo o resultado,
        // o que descarta item inventado, duplicado ou reordenado de uma vez so.
        let cursor = 0;
        for (const item of result) {
          cursor = items.indexOf(item, cursor) + 1;
          expect(cursor).toBeGreaterThan(0);
        }
      }),
    );
  });

  test("todo item do resultado satisfaz os dois filtros isoladamente", () => {
    fc.assert(
      fc.property(itemsArb, qArb, typeFilterArb, (items, q, type) => {
        for (const item of applyFilters(items, { q, type })) {
          expect(filterByName([item], q)).toHaveLength(1);
          expect(filterByType([item], type)).toHaveLength(1);
        }
      }),
    );
  });

  test("filtrar duas vezes com o mesmo criterio nao tira mais nada", () => {
    fc.assert(
      fc.property(itemsArb, qArb, typeFilterArb, (items, q, type) => {
        const once = applyFilters(items, { q, type });

        expect(applyFilters(once, { q, type })).toEqual(once);
      }),
    );
  });
});
