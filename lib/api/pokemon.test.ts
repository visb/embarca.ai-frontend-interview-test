import { beforeEach, describe, expect, test, vi } from "vitest";

import type * as HttpModule from "@/lib/api/http";
import { PokeApiError } from "@/lib/api/http";
import { CATALOG_SIZE, getPokemonByName, getPokemonCatalog, getTypes } from "@/lib/api/pokemon";
import type { PokemonDetailResponse } from "@/lib/api/types";
import { makeDetailResponse, makeSprites, makeTypeSlots } from "@/test/fixtures/pokemon";

const { pokeApiFetchMock } = vi.hoisted(() => ({ pokeApiFetchMock: vi.fn() }));

// Fronteira de rede: o servico e testado sem tocar na PokeAPI. `PokeApiError`
// continua sendo o real, senao o `instanceof` do consumidor nao provaria nada.
vi.mock("@/lib/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof HttpModule>()),
  pokeApiFetch: pokeApiFetchMock,
}));

// `cacheLife` so existe dentro do runtime do Next; fora dele o cache nao e o
// sujeito do teste.
vi.mock("next/cache", () => ({ cacheLife: () => {} }));

/** Payload de detalhe de um pokemon sintetico do catalogo. */
function detailFor(id: number): PokemonDetailResponse {
  return makeDetailResponse({
    id,
    name: `especie${id}`,
    types: makeTypeSlots(["grass", "poison"]),
    sprites: makeSprites(id),
  });
}

/** Faz o cliente HTTP responder a listagem e a cada detalhe do catalogo. */
function stubCatalogResponses(overrides: Record<number, () => Promise<unknown>> = {}) {
  pokeApiFetchMock.mockImplementation(async (path: string) => {
    if (path.startsWith("/pokemon?")) {
      return {
        count: CATALOG_SIZE,
        next: null,
        previous: null,
        results: Array.from({ length: CATALOG_SIZE }, (_, index) => ({
          name: `especie${index + 1}`,
          url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/`,
        })),
      };
    }

    const id = Number(path.slice("/pokemon/".length));
    return overrides[id] ? overrides[id]() : detailFor(id);
  });
}

beforeEach(() => {
  pokeApiFetchMock.mockReset();
});

describe("getPokemonCatalog", () => {
  test(`devolve os ${CATALOG_SIZE} pokemons do recorte do desafio`, async () => {
    stubCatalogResponses();

    await expect(getPokemonCatalog()).resolves.toHaveLength(CATALOG_SIZE);
  });

  test("devolve o modelo de dominio, nao o payload cru da API", async () => {
    stubCatalogResponses();

    const [first] = await getPokemonCatalog();

    expect(first).toEqual({
      id: 1,
      name: "especie1",
      types: ["grass", "poison"],
      spriteUrl: makeSprites(1).other?.["official-artwork"]?.front_default,
    });
  });

  test("uma falha de detalhe derruba o catalogo em vez de devolver lista pela metade", async () => {
    stubCatalogResponses({
      42: () => Promise.reject(new PokeApiError("boom", 500, "/pokemon/42")),
    });

    await expect(getPokemonCatalog()).rejects.toBeInstanceOf(PokeApiError);
  });
});

describe("getPokemonByName", () => {
  test("devolve o detalhe completo do pokemon pedido", async () => {
    pokeApiFetchMock.mockResolvedValue(detailFor(25));

    const detail = await getPokemonByName("pikachu");

    expect(detail).toMatchObject({ id: 25, name: "especie25", types: ["grass", "poison"] });
    expect(detail?.abilities.length).toBeGreaterThan(0);
  });

  test("pokemon inexistente devolve null, e nao um erro que a rota tenha que reconhecer", async () => {
    pokeApiFetchMock.mockRejectedValue(
      new PokeApiError("Recurso nao encontrado", 404, "/pokemon/nao-existe"),
    );

    // Um erro lancado daqui atravessaria a fronteira do `"use cache"` sem a
    // identidade de classe, e o `instanceof` da rota daria falso — era assim
    // que o not-found nunca aparecia.
    await expect(getPokemonByName("nao-existe")).resolves.toBeNull();
  });

  test("a API fora do ar continua sendo erro, e nao 'nao encontrado'", async () => {
    pokeApiFetchMock.mockRejectedValue(new PokeApiError("boom", 500, "/pokemon/pikachu"));

    // Sem este par o `null` engoliria qualquer falha e todo problema viraria
    // "esse pokemon nao existe".
    await expect(getPokemonByName("pikachu")).rejects.toMatchObject({ status: 500 });
  });

  test("falha de rede tambem sobe, em vez de virar null", async () => {
    pokeApiFetchMock.mockRejectedValue(new PokeApiError("Falha de rede", 0, "/pokemon/pikachu"));

    await expect(getPokemonByName("pikachu")).rejects.toBeInstanceOf(PokeApiError);
  });
});

describe("getTypes", () => {
  /**
   * Responde o `/type` com os nomes pedidos e o catalogo com um pokemon por
   * conjunto de tipos — e o cruzamento dos dois que a funcao faz.
   */
  function stubTypes(typeNames: string[], catalogTypes: string[][]) {
    pokeApiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/type") {
        return {
          count: typeNames.length,
          results: typeNames.map((name) => ({
            name,
            url: `https://pokeapi.co/api/v2/type/${name}/`,
          })),
        };
      }

      if (path.startsWith("/pokemon?")) {
        return {
          count: catalogTypes.length,
          next: null,
          previous: null,
          results: catalogTypes.map((_, index) => ({
            name: `especie${index + 1}`,
            url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/`,
          })),
        };
      }

      const id = Number(path.slice("/pokemon/".length));
      return makeDetailResponse({
        id,
        name: `especie${id}`,
        types: makeTypeSlots(catalogTypes[id - 1]),
        sprites: makeSprites(id),
      });
    });
  }

  test("nao oferece tipos que nenhum pokemon do catalogo possui", async () => {
    // `stellar` e o caso real: tipo da geracao 9, legitimo na API, ausente dos
    // 100 primeiros pokemons. Escolhe-lo levava sempre ao estado vazio.
    stubTypes(
      ["fire", "stellar", "water", "unknown", "shadow", "electric"],
      [["fire"], ["water"], ["electric"]],
    );

    await expect(getTypes()).resolves.toEqual([
      { name: "fire" },
      { name: "water" },
      { name: "electric" },
    ]);
  });

  test("a ordem e a da API, que e a ordem canonica das opcoes", async () => {
    // Nem alfabetica nem a do catalogo: mudar a ordem mexeria na UI sem pedido.
    stubTypes(["water", "fire", "grass"], [["grass"], ["fire"], ["water"]]);

    const types = await getTypes();

    expect(types.map((type) => type.name)).toEqual(["water", "fire", "grass"]);
  });

  test("tipo de um unico pokemon continua na lista: a regra e existir, nao ser comum", async () => {
    stubTypes(["fire", "ghost"], [["fire"], ["fire"], ["ghost"]]);

    await expect(getTypes()).resolves.toEqual([{ name: "fire" }, { name: "ghost" }]);
  });

  test("caixa diferente entre os dois endpoints nao derruba o tipo", async () => {
    // Os mappers normalizam os dois lados; sem isso o cruzamento perderia o
    // tipo em silencio e a opcao sumiria do filtro.
    stubTypes(["Fire", "water"], [["FIRE"], ["water"]]);

    await expect(getTypes()).resolves.toEqual([{ name: "fire" }, { name: "water" }]);
  });

  test("catalogo vazio devolve lista vazia, sem estourar", async () => {
    stubTypes(["fire", "water"], []);

    await expect(getTypes()).resolves.toEqual([]);
  });
});
