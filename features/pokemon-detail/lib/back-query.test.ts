import { describe, expect, test } from "vitest";

import { backQuery } from "@/features/pokemon-detail/lib/back-query";

describe("backQuery", () => {
  test("sem params, a volta e para a listagem limpa", () => {
    expect(backQuery({})).toBe("");
  });

  test("carrega busca, tipos e cursor de volta para a listagem", () => {
    expect(backQuery({ q: "pika", type: "electric,fire", page: "3" })).toBe(
      "q=pika&type=electric,fire&page=3",
    );
  });

  test("param repetido e descartado: a listagem so entende um valor por chave", () => {
    expect(backQuery({ q: ["pika", "char"] })).toBe("");
  });

  test("pagina 1 nao viaja: a listagem canonica e a URL sem `page`", () => {
    expect(backQuery({ page: "1" })).toBe("");
  });
});
