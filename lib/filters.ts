import type { PokemonSummary } from "@/lib/api/types";
import { filterByName } from "@/lib/search";

export interface ListingFilters {
  q?: string;
  type?: string;
}

/**
 * Filtra por tipo em memoria, e nao via `GET /type/{name}`: o catalogo ja tem
 * os tipos, e cruzar dois conjuntos vindos de endpoints diferentes com a busca
 * ativa geraria inconsistencia e chamadas extras.
 *
 * Tipo vazio ou desconhecido devolve a lista intacta — `?type=banana` e
 * ignorado, nao vira erro.
 */
export function filterByType<T extends Pick<PokemonSummary, "types">>(
  items: T[],
  type?: string,
): T[] {
  if (!type) return items;
  return items.filter((item) => item.types.includes(type));
}

/**
 * Pipeline unico da listagem: nome -> tipo. A ordem e cravada aqui de
 * proposito, para nao existirem dois caminhos de filtragem divergentes.
 * A paginacao roda depois, sobre o resultado.
 */
export function applyFilters<T extends Pick<PokemonSummary, "name" | "types">>(
  items: T[],
  { q = "", type }: ListingFilters,
): T[] {
  return filterByType(filterByName(items, q), type);
}
