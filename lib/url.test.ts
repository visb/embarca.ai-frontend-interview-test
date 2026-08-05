import { describe, expect, test } from "vitest";

import { buildQuery, listingHref } from "@/lib/url";

/** Query string -> objeto, para a assercao nao depender da ordem das chaves. */
const asParams = (query: string) => Object.fromEntries(new URLSearchParams(query));

describe("buildQuery", () => {
  test("mudar a busca descarta a pagina atual", () => {
    expect(asParams(buildQuery("page=3", { q: "pika" }))).toEqual({ q: "pika" });
  });

  test("mudar o tipo descarta a pagina atual", () => {
    expect(asParams(buildQuery("page=3", { type: "fire" }))).toEqual({ type: "fire" });
  });

  test("mudar so a pagina preserva busca e tipo", () => {
    expect(asParams(buildQuery("q=pika&type=electric", { page: 2 }))).toEqual({
      q: "pika",
      type: "electric",
      page: "2",
    });
  });

  test("param vazio some da URL em vez de virar chave sem valor", () => {
    expect(buildQuery("q=pika", { q: "" })).toBe("");
  });

  test("param nulo some da URL", () => {
    expect(buildQuery("q=pika&type=fire", { type: null })).toBe("q=pika");
  });

  test("varios tipos viram uma lista separada por virgula", () => {
    // Lista num param unico, e nao param repetido: `params.set()` e chave unica,
    // e a URL fica curta e colavel.
    expect(asParams(buildQuery("", { type: ["fire", "water"] }))).toEqual({
      type: "fire,water",
    });
  });

  test("a virgula sai literal na URL, e nao escapada", () => {
    // `?type=fire%2Cwater` funciona e e ilegivel; a virgula e sub-delimitador
    // valido numa query.
    expect(buildQuery("", { type: ["fire", "water"] })).toBe("type=fire,water");
  });

  test("lista de tipos vazia some da URL, igual a string vazia", () => {
    expect(buildQuery("q=pika&type=fire,water", { type: [] })).toBe("q=pika");
  });

  test("mexer nos tipos continua zerando a pagina", () => {
    expect(asParams(buildQuery("page=3&type=fire", { type: ["fire", "water"] }))).toEqual({
      type: "fire,water",
    });
  });

  test("params nao tocados sao preservados", () => {
    expect(asParams(buildQuery("q=pika&type=electric", { q: "rai" }))).toEqual({
      q: "rai",
      type: "electric",
    });
  });

  test("pagina 1 nunca aparece na URL", () => {
    expect(buildQuery("", { page: 1 })).toBe("");
    expect(asParams(buildQuery("q=pika", { page: 1 }))).toEqual({ q: "pika" });
  });

  test("tira os espacos das pontas do valor", () => {
    expect(asParams(buildQuery("", { q: "  pika  " }))).toEqual({ q: "pika" });
  });

  test("valor que vira vazio depois do trim some da URL", () => {
    expect(buildQuery("q=pika", { q: "   " })).toBe("");
  });

  test("aceita URLSearchParams como estado atual", () => {
    const current = new URLSearchParams("q=pika&page=4");

    expect(asParams(buildQuery(current, { type: "electric" }))).toEqual({
      q: "pika",
      type: "electric",
    });
  });

  test("nao muta o URLSearchParams recebido", () => {
    const current = new URLSearchParams("q=pika&page=4");

    buildQuery(current, { q: "rai" });

    expect(current.toString()).toBe("q=pika&page=4");
  });
});

describe("listingHref", () => {
  test("query vazia vira a URL canonica da listagem, sem interrogacao", () => {
    expect(listingHref("")).toBe("/");
  });

  test("query preenchida vira a listagem filtrada", () => {
    expect(listingHref("q=pika&type=electric")).toBe("/?q=pika&type=electric");
  });
});
