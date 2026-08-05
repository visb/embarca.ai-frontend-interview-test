import type { PokemonSummary } from "@/lib/api/types";
import { filterByName } from "@/features/catalog/lib/search";

export interface ListingFilters {
  q?: string;
  types?: string[];
}

/**
 * Filtra por tipo em memoria, e nao via `GET /type/{name}`: o catalogo ja tem
 * os tipos, e cruzar dois conjuntos vindos de endpoints diferentes com a busca
 * ativa geraria inconsistencia e chamadas extras.
 *
 * Varios tipos combinam por **OU**: marcar fire e water mostra quem tem fire ou
 * water. Cada tipo marcado amplia o resultado, que e o que um multi-select de
 * filtro comunica — mais caixas marcadas, mais coisa na tela. Interseccao foi
 * descartada: alem de reduzir a cada marca (o inverso do que a UI sugere), a
 * maioria das combinacoes de dois tipos nao existe num catalogo de 100, entao
 * quase toda interacao cairia no estado vazio.
 *
 * Lista vazia devolve o catalogo intacto. Tipo **desconhecido nao amplia nada**
 * — ele simplesmente nao casa com ninguem, e sozinho devolve `[]`. Quem
 * neutraliza `?type=banana` antes de chegar aqui e o `parseTypeParams`, que
 * valida contra os tipos reais.
 */
export function filterByType<T extends Pick<PokemonSummary, "types">>(
  items: T[],
  types?: string[],
): T[] {
  if (!types?.length) return items;
  return items.filter((item) => item.types.some((type) => types.includes(type)));
}

/**
 * Pipeline unico da listagem: nome -> tipo. A ordem e cravada aqui de
 * proposito, para nao existirem dois caminhos de filtragem divergentes.
 * A paginacao roda depois, sobre o resultado.
 *
 * Os dois criterios se cruzam por **E**: nome E (tipo OU tipo). Sao dois niveis
 * de combinacao diferentes e deliberados.
 */
export function applyFilters<T extends Pick<PokemonSummary, "name" | "types">>(
  items: T[],
  { q = "", types }: ListingFilters,
): T[] {
  return filterByType(filterByName(items, q), types);
}
