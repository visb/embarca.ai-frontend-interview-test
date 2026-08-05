import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { applyFilters, filterByType } from "@/features/catalog/lib/filters";
import { filterByName } from "@/features/catalog/lib/search";
import { makeSummary } from "@/test/fixtures/pokemon";

const bulbasaur = makeSummary({ id: 1, name: "bulbasaur", types: ["grass", "poison"] });
const charmander = makeSummary({ id: 4, name: "charmander", types: ["fire"] });
const squirtle = makeSummary({ id: 7, name: "squirtle", types: ["water"] });
const oddish = makeSummary({ id: 43, name: "oddish", types: ["grass", "poison"] });

const catalog = [bulbasaur, charmander, squirtle, oddish];

describe("filterByType", () => {
  test("sem tipo devolve o catalogo intacto", () => {
    expect(filterByType(catalog, [])).toEqual(catalog);
    expect(filterByType(catalog, undefined)).toEqual(catalog);
  });

  test("pokemon de tipo duplo aparece na busca por qualquer um dos dois", () => {
    expect(filterByType(catalog, ["grass"])).toContain(bulbasaur);
    expect(filterByType(catalog, ["poison"])).toContain(bulbasaur);
  });

  test("filtra apenas quem tem o tipo pedido", () => {
    expect(filterByType(catalog, ["fire"])).toEqual([charmander]);
  });

  test("dois tipos sao uniao, nao intersecao", () => {
    // Marcar mais amplia: e o que a UI de checkboxes comunica.
    expect(filterByType(catalog, ["fire", "water"])).toEqual([charmander, squirtle]);
  });

  test("pokemon com os dois tipos marcados aparece uma vez so", () => {
    // A uniao nao pode duplicar quem satisfaz mais de um criterio.
    expect(filterByType(catalog, ["grass", "poison"])).toEqual([bulbasaur, oddish]);
  });

  /**
   * Quem neutraliza `?type=banana` e o `parseTypeParams`, antes de chegar aqui —
   * ver `lib/search-params.test.ts`. Nesta funcao um tipo que ninguem possui e
   * so um filtro que nao casa com nada.
   */
  test("tipo que nenhum pokemon possui devolve lista vazia", () => {
    expect(filterByType(catalog, ["banana"])).toEqual([]);
  });

  test("tipo desconhecido no meio do conjunto nao amplia nem zera o resultado", () => {
    expect(filterByType(catalog, ["fire", "banana"])).toEqual([charmander]);
  });
});

describe("applyFilters", () => {
  test("busca e tipo juntos sao intersecao, nao uniao", () => {
    const result = applyFilters(catalog, { q: "bulba", types: ["grass"] });

    expect(result).toEqual([bulbasaur]);
  });

  test("nada satisfaz os dois filtros ao mesmo tempo devolve vazio", () => {
    expect(applyFilters(catalog, { q: "bulba", types: ["fire"] })).toEqual([]);
  });

  test("busca com varios tipos e nome E (tipo OU tipo)", () => {
    // Os dois niveis de combinacao convivem: `charmander` bate o nome e um dos
    // tipos; `squirtle` bate um tipo mas nao o nome.
    expect(applyFilters(catalog, { q: "char", types: ["fire", "water"] })).toEqual([charmander]);
  });

  test("sem filtro nenhum devolve o catalogo inteiro", () => {
    expect(applyFilters(catalog, {})).toEqual(catalog);
  });

  test("so a busca ignora o tipo", () => {
    expect(applyFilters(catalog, { q: "dish" })).toEqual([oddish]);
  });

  test("so o tipo ignora a busca", () => {
    expect(applyFilters(catalog, { types: ["water"] })).toEqual([squirtle]);
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
const typesArb = fc.uniqueArray(typeArb, { maxLength: 3 });

describe("propriedades de applyFilters", () => {
  test("filtrar por nome e por tipo em qualquer ordem da o mesmo conjunto", () => {
    fc.assert(
      fc.property(itemsArb, qArb, typesArb, (items, q, types) => {
        const nomeDepoisTipo = filterByName(filterByType(items, types), q);

        expect(applyFilters(items, { q, types })).toEqual(nomeDepoisTipo);
      }),
    );
  });

  test("o resultado e sempre um subconjunto da entrada, na mesma ordem", () => {
    fc.assert(
      fc.property(itemsArb, qArb, typesArb, (items, q, types) => {
        const result = applyFilters(items, { q, types });

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
      fc.property(itemsArb, qArb, typesArb, (items, q, types) => {
        for (const item of applyFilters(items, { q, types })) {
          expect(filterByName([item], q)).toHaveLength(1);
          expect(filterByType([item], types)).toHaveLength(1);
        }
      }),
    );
  });

  test("filtrar duas vezes com o mesmo criterio nao tira mais nada", () => {
    fc.assert(
      fc.property(itemsArb, qArb, typesArb, (items, q, types) => {
        const once = applyFilters(items, { q, types });

        expect(applyFilters(once, { q, types })).toEqual(once);
      }),
    );
  });

  // Conjunto ja com pelo menos um tipo: sair de "sem filtro" para "um tipo"
  // reduz por definicao, e nao e desse degrau que a monotonicidade fala.
  const filledTypesArb = fc.uniqueArray(typeArb, { minLength: 1, maxLength: 3 });

  test("acrescentar um tipo nunca reduz o resultado", () => {
    // A trava formal do OU: se marcar mais reduzisse, o filtro seria intersecao
    // com uma UI que promete o contrario.
    fc.assert(
      fc.property(itemsArb, filledTypesArb, typeArb, (items, types, extra) => {
        const antes = filterByType(items, types);
        const depois = filterByType(items, [...types, extra]);

        expect(depois.length).toBeGreaterThanOrEqual(antes.length);
        for (const item of antes) expect(depois).toContain(item);
      }),
    );
  });
});
