import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { POKEAPI_BASE_URL, PokeApiError, pokeApiFetch } from "@/lib/api/http";

/**
 * `fetch` e a unica fronteira de I/O do projeto, entao e o unico ponto stubado
 * aqui. As URLs pedidas sao coletadas neste array: a assercao e sobre *o que
 * foi requisitado*, nao sobre "o mock foi chamado".
 */
let requestedUrls: string[] = [];

/** Resposta minima com o suficiente para o cliente decidir o caminho. */
function respondWith(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", (input: string) => {
    requestedUrls.push(input);
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}), ...response });
  });
}

beforeEach(() => {
  requestedUrls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pokeApiFetch", () => {
  test("resposta 200 devolve o payload ja parseado", async () => {
    respondWith({ json: async () => ({ name: "pikachu" }) });

    await expect(pokeApiFetch("/pokemon/25")).resolves.toEqual({ name: "pikachu" });
  });

  test("caminho relativo e resolvido contra a base da PokeAPI", async () => {
    respondWith({});

    await pokeApiFetch("/pokemon/25");

    expect(requestedUrls).toEqual([`${POKEAPI_BASE_URL}/pokemon/25`]);
  });

  test("URL absoluta vinda do payload nao recebe a base como prefixo", async () => {
    respondWith({});

    await pokeApiFetch("https://pokeapi.co/api/v2/pokemon/25/");

    expect(requestedUrls).toEqual(["https://pokeapi.co/api/v2/pokemon/25/"]);
  });

  test("404 vira erro tipado que a rota reconhece como nao encontrado", async () => {
    respondWith({ ok: false, status: 404 });

    const error = await pokeApiFetch("/pokemon/nao-existe").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PokeApiError);
    expect(error).toMatchObject({ status: 404, isNotFound: true });
  });

  test("500 vira erro tipado que nao se confunde com nao encontrado", async () => {
    respondWith({ ok: false, status: 500 });

    const error = await pokeApiFetch("/pokemon/25").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PokeApiError);
    expect(error).toMatchObject({ status: 500, isNotFound: false });
  });

  test("o erro carrega a URL que falhou, para o diagnostico nao depender do stack", async () => {
    respondWith({ ok: false, status: 500 });

    const error = await pokeApiFetch("/pokemon/25").catch((caught: unknown) => caught);

    expect(error).toMatchObject({ url: `${POKEAPI_BASE_URL}/pokemon/25` });
  });

  test("JSON quebrado vira erro da PokeAPI, nao um TypeError cru", async () => {
    respondWith({
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    const error = await pokeApiFetch("/pokemon/25").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PokeApiError);
    expect(error).toMatchObject({ status: 200 });
  });

  test("falha de rede vira status 0 preservando a causa original", async () => {
    const cause = new Error("ECONNREFUSED");
    vi.stubGlobal("fetch", () => Promise.reject(cause));

    const error = await pokeApiFetch("/pokemon/25").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PokeApiError);
    expect(error).toMatchObject({ status: 0, isNotFound: false, cause });
  });
});
