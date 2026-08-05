import { describe, expect, test } from "vitest";

import { formatPokedexNumber, formatPokemonName } from "@/lib/format";

describe("formatPokedexNumber", () => {
  test("completa com zeros ate quatro digitos", () => {
    expect(formatPokedexNumber(25)).toBe("#0025");
    expect(formatPokedexNumber(1)).toBe("#0001");
    expect(formatPokedexNumber(100)).toBe("#0100");
  });

  test("numero com quatro digitos nao ganha zeros a mais", () => {
    expect(formatPokedexNumber(1025)).toBe("#1025");
  });

  test("todos os numeros da pokedex tem a mesma largura", () => {
    const widths = [1, 25, 100, 1000].map((id) => formatPokedexNumber(id).length);

    expect(new Set(widths).size).toBe(1);
  });
});

describe("formatPokemonName", () => {
  test("capitaliza o nome vindo em minusculas", () => {
    expect(formatPokemonName("pikachu")).toBe("Pikachu");
  });

  test("hifen vira espaco com as duas partes capitalizadas", () => {
    expect(formatPokemonName("mr-mime")).toBe("Mr Mime");
  });

  test("nome com mais de um hifen mantem todas as partes", () => {
    expect(formatPokemonName("nidoran-f-test")).toBe("Nidoran F Test");
  });

  test("nome vazio nao quebra", () => {
    expect(formatPokemonName("")).toBe("");
  });
});
