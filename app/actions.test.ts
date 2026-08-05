import { beforeEach, describe, expect, test, vi } from "vitest";

import { loadPokemonPage } from "@/app/actions";
import type * as PokemonService from "@/lib/api/pokemon";
import { applyFilters } from "@/lib/filters";
import { paginate } from "@/lib/pagination";
import { makeCatalog } from "@/test/fixtures/pokemon";

const { getPokemonCatalogMock, getTypesMock } = vi.hoisted(() => ({
  getPokemonCatalogMock: vi.fn(),
  getTypesMock: vi.fn(),
}));

// Fronteira de rede. O que esta em teste e o pipeline `filtrar -> paginar`,
// nao de onde o catalogo veio.
vi.mock("@/lib/api/pokemon", async (importOriginal) => ({
  ...(await importOriginal<typeof PokemonService>()),
  getPokemonCatalog: getPokemonCatalogMock,
  getTypes: getTypesMock,
}));

vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const catalog = makeCatalog(100);
const KNOWN_TYPES = ["grass", "poison", "fire", "water", "bug", "flying", "electric"];

beforeEach(() => {
  getPokemonCatalogMock.mockResolvedValue(catalog);
  getTypesMock.mockResolvedValue(KNOWN_TYPES.map((name) => ({ name })));
});

describe("loadPokemonPage", () => {
  test("sem filtro, a fatia pedida e a mesma que o servidor renderizaria", async () => {
    const result = await loadPokemonPage(2, {});

    expect(result).toEqual({
      items: catalog.slice(20, 40),
      page: 2,
      hasMore: true,
      total: 100,
    });
  });

  test("filtra antes de fatiar, entao rolar e recarregar nunca divergem", async () => {
    const result = await loadPokemonPage(1, { q: "especie1", type: "grass" });

    const expected = paginate(applyFilters(catalog, { q: "especie1", type: "grass" }), 1);

    expect(result.items).toEqual(expected.items);
    expect(result.total).toBe(expected.total);
  });

  test("o total anunciado e o do conjunto filtrado, nao o do catalogo inteiro", async () => {
    const result = await loadPokemonPage(1, { type: "fire" });

    expect(result.total).toBe(20);
    expect(result.total).toBeLessThan(catalog.length);
  });

  test("conjunto filtrado que cabe numa fatia encerra a lista de uma vez", async () => {
    const result = await loadPokemonPage(1, { type: "fire" });

    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(false);
  });

  test("pagina negativa vinda do cliente cai na primeira fatia em vez de estourar", async () => {
    const result = await loadPokemonPage(-3, {});

    expect(result.page).toBe(1);
    expect(result.items).toEqual(catalog.slice(0, 20));
  });

  test("pagina que nao e numero cai na primeira fatia", async () => {
    const result = await loadPokemonPage(Number.NaN, {});

    expect(result.page).toBe(1);
    expect(result.items).toEqual(catalog.slice(0, 20));
  });

  test("pagina acima do total cai na ultima fatia existente", async () => {
    const result = await loadPokemonPage(999, {});

    expect(result.page).toBe(5);
    expect(result.hasMore).toBe(false);
  });

  test("tipo desconhecido vindo do cliente e neutralizado, nao esvazia a lista", async () => {
    const result = await loadPokemonPage(1, { type: "banana" });

    expect(result.total).toBe(100);
    expect(result.items).toEqual(catalog.slice(0, 20));
  });

  test("busca com espacos sobrando e normalizada antes de filtrar", async () => {
    const comEspacos = await loadPokemonPage(1, { q: "  especie7  " });
    const semEspacos = await loadPokemonPage(1, { q: "especie7" });

    expect(comEspacos.items).toEqual(semEspacos.items);
    expect(comEspacos.total).toBeGreaterThan(0);
  });

  test("busca sem resultado devolve lista vazia sem continuacao", async () => {
    const result = await loadPokemonPage(1, { q: "digimon" });

    expect(result).toEqual({ items: [], page: 1, hasMore: false, total: 0 });
  });
});
