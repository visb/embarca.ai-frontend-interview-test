"use server";

import { getPokemonCatalog, getTypes } from "@/lib/api/pokemon";
import type { PokemonSummary } from "@/lib/api/types";
import { applyFilters } from "@/lib/filters";
import { paginate } from "@/lib/pagination";
import { parsePageParam, parseQueryParam, parseTypeParams } from "@/lib/search-params";

export interface PokemonPage {
  items: PokemonSummary[];
  /** Fatia efetivamente devolvida, ja com clamp. */
  page: number;
  hasMore: boolean;
  total: number;
}

/**
 * Proxima fatia da listagem, para o scroll infinito.
 *
 * Corta o catalogo que ja esta em cache — nenhuma chamada nova a PokeAPI. A
 * alternativa (mandar os 100 itens no payload inicial e fatiar no cliente)
 * carregaria 5x mais dado do que a tela mostra e tornaria o loading uma
 * encenacao, ja que nao existiria espera nenhuma.
 *
 * O pipeline `filtrar -> paginar` e o mesmo da renderizacao no servidor, entao
 * rolar e recarregar a pagina nunca divergem.
 */
export async function loadPokemonPage(
  page: number,
  filters: { q?: string; types?: string[] | string },
): Promise<PokemonPage> {
  const [catalog, types] = await Promise.all([getPokemonCatalog(), getTypes()]);

  // O cliente pode mandar qualquer coisa: tudo passa pelos mesmos parsers da URL.
  const q = parseQueryParam(filters.q);
  const selectedTypes = parseTypeParams(
    Array.isArray(filters.types) ? filters.types.join(",") : filters.types,
    types.map((entry) => entry.name),
  );

  const result = paginate(
    applyFilters(catalog, { q, types: selectedTypes }),
    parsePageParam(String(page)),
  );

  return {
    items: result.items,
    page: result.page,
    hasMore: result.hasMore,
    total: result.total,
  };
}
