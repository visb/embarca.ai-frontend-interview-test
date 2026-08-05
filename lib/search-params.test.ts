import { describe, expect, test } from "vitest";

import { parsePageParam, parseQueryParam, parseTypeParam } from "@/lib/search-params";

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

describe("parseTypeParam", () => {
  test("tipo conhecido passa", () => {
    expect(parseTypeParam("fire", KNOWN_TYPES)).toBe("fire");
  });

  test("tipo fora da lista conhecida e descartado", () => {
    expect(parseTypeParam("banana", KNOWN_TYPES)).toBeUndefined();
  });

  test("param ausente nao filtra", () => {
    expect(parseTypeParam(undefined, KNOWN_TYPES)).toBeUndefined();
  });

  test("so espacos nao filtra", () => {
    expect(parseTypeParam("  ", KNOWN_TYPES)).toBeUndefined();
  });

  test("normaliza caixa e espacos antes de validar", () => {
    expect(parseTypeParam("  FIRE ", KNOWN_TYPES)).toBe("fire");
  });

  test("param repetido na URL usa a primeira ocorrencia", () => {
    expect(parseTypeParam(["water", "fire"], KNOWN_TYPES)).toBe("water");
  });

  test("lista de tipos vazia recusa qualquer valor", () => {
    expect(parseTypeParam("fire", [])).toBeUndefined();
  });
});
