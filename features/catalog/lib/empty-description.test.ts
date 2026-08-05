import { describe, expect, test } from "vitest";

import { buildEmptyDescription } from "@/features/catalog/lib/empty-description";

describe("buildEmptyDescription", () => {
  test("sem filtro nenhum, aponta a saida em vez de descrever o vazio", () => {
    expect(buildEmptyDescription("", [])).toBe("Tente outro termo ou volte para a lista completa.");
  });

  test("so busca: o termo aparece entre aspas", () => {
    expect(buildEmptyDescription("xyz", [])).toBe('Nada combina com "xyz".');
  });

  test("um tipo vai no singular", () => {
    expect(buildEmptyDescription("", ["fire"])).toBe("Nenhum pokemon do tipo fire nesta lista.");
  });

  test("varios tipos vao no plural, na ordem recebida", () => {
    expect(buildEmptyDescription("", ["fire", "water"])).toBe(
      "Nenhum pokemon dos tipos fire, water nesta lista.",
    );
  });

  test("busca e tipo juntos dizem os dois: o usuario precisa saber qual zerou a lista", () => {
    expect(buildEmptyDescription("pika", ["fire"])).toBe('Nada combina com "pika" no tipo fire.');
  });

  test("busca com varios tipos concorda no plural", () => {
    expect(buildEmptyDescription("pika", ["fire", "water"])).toBe(
      'Nada combina com "pika" nos tipos fire, water.',
    );
  });
});
