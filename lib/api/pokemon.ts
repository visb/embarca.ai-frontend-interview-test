import { cacheLife } from "next/cache";

import { pokeApiFetch } from "./http";
import { extractIdFromUrl, toPokemonDetail, toPokemonSummary, toPokemonType } from "./mappers";
import type {
  PokemonDetail,
  PokemonDetailResponse,
  PokemonListResponse,
  PokemonSummary,
  PokemonType,
  TypeListResponse,
} from "./types";

/** Recorte fixo do desafio: os 100 primeiros pokemons. */
export const CATALOG_SIZE = 100;

/**
 * Tipos que a API expoe mas que nao pertencem a nenhum pokemon da pokedex
 * principal — deixa-los no filtro so produziria opcoes que nunca retornam nada.
 */
const NON_BATTLE_TYPES = new Set(["unknown", "shadow"]);

/**
 * Catalogo normalizado dos 100 primeiros pokemons.
 *
 * `GET /pokemon?limit=100` devolve apenas `{ name, url }` — sem tipo e sem
 * imagem —, mas o card exige os dois. Por isso a montagem custa 1 + 100
 * requisicoes. O custo e pago uma vez: `use cache` guarda o resultado, e dado
 * de pokedex e praticamente imutavel, o que justifica um `cacheLife` longo.
 *
 * Busca, filtro e paginacao operam sobre este array em memoria.
 */
export async function getPokemonCatalog(): Promise<PokemonSummary[]> {
  "use cache";
  cacheLife("max");

  const index = await pokeApiFetch<PokemonListResponse>(`/pokemon?limit=${CATALOG_SIZE}&offset=0`);

  const details = await Promise.all(
    index.results.map((resource) =>
      pokeApiFetch<PokemonDetailResponse>(`/pokemon/${extractIdFromUrl(resource.url)}`),
    ),
  );

  return details.map(toPokemonSummary);
}

/**
 * Detalhe de um pokemon pelo nome (ou ID).
 *
 * Erros 404 sobem como `PokeApiError` com `status: 404` para a rota decidir
 * entre `notFound()` e a UI de erro.
 */
export async function getPokemonByName(name: string): Promise<PokemonDetail> {
  "use cache";
  cacheLife("max");

  const detail = await pokeApiFetch<PokemonDetailResponse>(
    `/pokemon/${encodeURIComponent(name.toLowerCase())}`,
  );

  return toPokemonDetail(detail);
}

/** Tipos disponiveis, usados apenas para popular as opcoes do filtro. */
export async function getTypes(): Promise<PokemonType[]> {
  "use cache";
  cacheLife("max");

  const response = await pokeApiFetch<TypeListResponse>("/type");

  return response.results
    .filter((resource) => !NON_BATTLE_TYPES.has(resource.name))
    .map(toPokemonType);
}
