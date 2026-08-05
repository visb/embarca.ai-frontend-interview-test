import { describe, expect, test } from "vitest";

import { filterByName } from "@/lib/search";
import { makeSummary } from "@/test/fixtures/pokemon";

const catalog = [
  makeSummary({ id: 25, name: "pikachu" }),
  makeSummary({ id: 26, name: "raichu" }),
  makeSummary({ id: 122, name: "mr-mime" }),
  makeSummary({ id: 4, name: "charmander" }),
];

const names = (items: typeof catalog) => items.map((item) => item.name);

describe("filterByName", () => {
  test("termo vazio devolve o catalogo inteiro", () => {
    expect(filterByName(catalog, "")).toEqual(catalog);
  });

  test("termo so com espacos devolve o catalogo inteiro", () => {
    expect(filterByName(catalog, "   ")).toEqual(catalog);
  });

  test("ignora maiusculas e minusculas", () => {
    expect(names(filterByName(catalog, "PIKA"))).toEqual(["pikachu"]);
  });

  test("acha por substring no meio do nome, nao so por prefixo", () => {
    expect(names(filterByName(catalog, "chu"))).toEqual(["pikachu", "raichu"]);
  });

  test("nome com hifen e achado pelas duas partes", () => {
    expect(names(filterByName(catalog, "mr"))).toEqual(["mr-mime"]);
    expect(names(filterByName(catalog, "mime"))).toEqual(["mr-mime"]);
  });

  test("nome com hifen e achado ignorando o proprio hifen", () => {
    expect(names(filterByName(catalog, "mrmime"))).toEqual(["mr-mime"]);
  });

  test("termo sem correspondencia devolve lista vazia", () => {
    expect(filterByName(catalog, "digimon")).toEqual([]);
  });

  test("espaco em volta do termo nao atrapalha a busca", () => {
    expect(names(filterByName(catalog, "  pika  "))).toEqual(["pikachu"]);
  });
});
