import { describe, expect, test } from "vitest";

import { parsePageParam, parseQueryParam, parseTypeParams } from "@/lib/search-params";

const KNOWN_TYPES = ["grass", "poison", "fire", "water", "electric"];

describe("parsePageParam", () => {
  test("param ausente cai na primeira pagina", () => {
    expect(parsePageParam(undefined)).toBe(1);
  });

  test("texto que nao e numero cai na primeira pagina", () => {
    expect(parsePageParam("abc")).toBe(1);
  });

  test("numero valido e respeitado", () => {
    expect(parsePageParam("2")).toBe(2);
  });

  test("decimal nao vira pagina fracionaria", () => {
    expect(parsePageParam("2.7")).toBe(1);
  });

  test("notacao cientifica nao vira pagina absurda", () => {
    expect(parsePageParam("1e3")).toBe(1);
  });

  test("valor negativo cai na primeira pagina", () => {
    expect(parsePageParam("-5")).toBe(1);
  });

  test("zero cai na primeira pagina", () => {
    expect(parsePageParam("0")).toBe(1);
  });

  test("string vazia cai na primeira pagina", () => {
    expect(parsePageParam("")).toBe(1);
  });

  test("param repetido na URL usa a primeira ocorrencia", () => {
    expect(parsePageParam(["2", "5"])).toBe(2);
  });

  test("array vazio cai na primeira pagina", () => {
    expect(parsePageParam([])).toBe(1);
  });
});

describe("parseQueryParam", () => {
  test("param ausente vira busca vazia", () => {
    expect(parseQueryParam(undefined)).toBe("");
  });

  test("so espacos vira busca vazia", () => {
    expect(parseQueryParam("   ")).toBe("");
  });

  test("tira os espacos das pontas do termo", () => {
    expect(parseQueryParam("  pikachu  ")).toBe("pikachu");
  });

  test("param repetido na URL usa a primeira ocorrencia", () => {
    expect(parseQueryParam(["pika", "chu"])).toBe("pika");
  });

  test("termo absurdamente longo e cortado em vez de trafegar inteiro", () => {
    expect(parseQueryParam("a".repeat(500))).toHaveLength(50);
  });
});

describe("parseTypeParams", () => {
  test("tipo conhecido passa", () => {
    expect(parseTypeParams("fire", KNOWN_TYPES)).toEqual(["fire"]);
  });

  test("varios tipos separados por virgula viram lista", () => {
    expect(parseTypeParams("fire,water", KNOWN_TYPES)).toEqual(["fire", "water"]);
  });

  test("a ordem e a do catalogo, nao a da URL", () => {
    // Sem isso `?type=fire,water` e `?type=water,fire` seriam URLs diferentes
    // para o mesmo resultado, duplicando cache e quebrando assercao de URL.
    expect(parseTypeParams("water,fire", KNOWN_TYPES)).toEqual(
      parseTypeParams("fire,water", KNOWN_TYPES),
    );
  });

  test("duplicata e lixo saem sem virar erro", () => {
    expect(parseTypeParams("fire,banana,fire", KNOWN_TYPES)).toEqual(["fire"]);
  });

  test("tipo fora da lista conhecida e descartado", () => {
    expect(parseTypeParams("banana", KNOWN_TYPES)).toEqual([]);
  });

  test("param ausente nao filtra", () => {
    expect(parseTypeParams(undefined, KNOWN_TYPES)).toEqual([]);
  });

  test("so espacos nao filtra", () => {
    expect(parseTypeParams("  ", KNOWN_TYPES)).toEqual([]);
  });

  test("so virgulas nao filtra", () => {
    expect(parseTypeParams(",,,", KNOWN_TYPES)).toEqual([]);
  });

  test("normaliza caixa e espacos antes de validar", () => {
    expect(parseTypeParams(" FIRE , Water ", KNOWN_TYPES)).toEqual(["fire", "water"]);
  });

  test("param repetido na URL usa a primeira ocorrencia", () => {
    expect(parseTypeParams(["water", "fire"], KNOWN_TYPES)).toEqual(["water"]);
  });

  test("lista de tipos vazia recusa qualquer valor", () => {
    expect(parseTypeParams("fire", [])).toEqual([]);
  });
});
