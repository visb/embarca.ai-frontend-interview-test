import { cacheLife } from "next/cache";

import { PokeApiError, pokeApiFetch } from "./http";
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
 * Detalhe de um pokemon pelo nome (ou ID). `null` quando o nome nao existe.
 *
 * O 404 e valor de retorno, e nao excecao, por causa do `"use cache"`: um erro
 * lancado aqui dentro atravessa a fronteira do cache sem a identidade de classe,
 * entao um `instanceof PokeApiError` do outro lado da falso e o `notFound()` da
 * rota nunca rodaria. O `instanceof` roda aqui, do lado de dentro, onde a
 * identidade e confiavel.
 *
 * "Esse nome nao existe" tambem e uma resposta prevista do dominio, e nao uma
 * falha — `null` e o tipo honesto, e o `strictNullChecks` obriga todo call site
 * a tratar. Erros nao-404 continuam sendo lancados: qualquer um deles resulta na
 * mesma UI de erro, entao nenhum precisa de identidade preservada.
 *
 * `null` e cacheado como qualquer outro valor, e isso e o desejado: nome
 * inexistente nao vira uma requisicao a PokeAPI por acesso.
 */
export async function getPokemonByName(name: string): Promise<PokemonDetail | null> {
  "use cache";
  cacheLife("max");

  try {
    const detail = await pokeApiFetch<PokemonDetailResponse>(
      `/pokemon/${encodeURIComponent(name.toLowerCase())}`,
    );

    return toPokemonDetail(detail);
  } catch (error) {
    if (error instanceof PokeApiError && error.isNotFound) return null;
    throw error;
  }
}

/**
 * Tipos oferecidos pelo filtro: apenas os que existem no catalogo.
 *
 * `GET /type` devolve tudo que a API conhece, inclusive o que nenhum pokemon
 * deste recorte possui — `unknown`, `shadow` e, desde a geracao 9, `stellar`.
 * Deixa-los no `<select>` cria opcao morta: o usuario escolhe um filtro
 * legitimo da lista e recebe "nenhum resultado", sem nada indicando que aquela
 * combinacao era impossivel desde o comeco.
 *
 * Por isso a lista e cruzada com o catalogo em vez de excluir nomes fixos: a
 * PokeAPI ganha tipos a cada geracao, e uma lista hardcoded reabriria o mesmo
 * bug na proxima. Nao ha custo de rede — as duas funcoes sao `"use cache"` com
 * `cacheLife("max")` e o catalogo ja e buscado no mesmo render da listagem.
 *
 * A ordem e a da API, que e a ordem canonica das `<option>`.
 */
export async function getTypes(): Promise<PokemonType[]> {
  "use cache";
  cacheLife("max");

  const [response, catalog] = await Promise.all([
    pokeApiFetch<TypeListResponse>("/type"),
    getPokemonCatalog(),
  ]);

  const inCatalog = new Set(catalog.flatMap((pokemon) => pokemon.types));

  return response.results.map(toPokemonType).filter((type) => inCatalog.has(type.name));
}
