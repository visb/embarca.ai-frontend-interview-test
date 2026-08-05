import { applyFilters } from "@/features/catalog/lib/filters";
import { paginateCumulative } from "@/features/catalog/lib/pagination";
import { getPokemonCatalog, getTypes } from "@/lib/api/pokemon";
import type { PokemonSummary } from "@/lib/api/types";
import { parsePageParam, parseQueryParam, parseTypeParams } from "@/lib/search-params";

/** `searchParams` como o Next entrega. */
type RawParams = Record<string, string | string[] | undefined>;

export interface Listing {
  items: PokemonSummary[];
  /** Fatia efetivamente devolvida, ja com clamp. */
  page: number;
  hasMore: boolean;
  total: number;
  /** Filtros normalizados — a View os repassa aos controles e ao link dos cards. */
  filters: { q: string; types: string[] };
}

/**
 * A listagem inteira a partir dos params da URL.
 *
 * Concentra o pipeline `parse -> filtrar -> paginar` num lugar so: a rota, a
 * View e a server action do scroll infinito compartilham exatamente o mesmo
 * caminho, entao rolar e recarregar nunca divergem.
 *
 * Acumulado, e nao a fatia: com scroll infinito o `?page=N` diz quantas fatias
 * ja foram carregadas — e o que devolve o usuario ao ponto certo ao voltar.
 */
export async function getListing(params: RawParams): Promise<Listing> {
  const [catalog, types] = await Promise.all([getPokemonCatalog(), getTypes()]);

  const q = parseQueryParam(params.q);
  const selectedTypes = parseTypeParams(
    params.type,
    types.map((entry) => entry.name),
  );

  const filtered = applyFilters(catalog, { q, types: selectedTypes });
  const result = paginateCumulative(filtered, parsePageParam(params.page));

  return {
    items: result.items,
    page: result.page,
    hasMore: result.hasMore,
    total: result.total,
    filters: { q, types: selectedTypes },
  };
}
