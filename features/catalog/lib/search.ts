import type { PokemonSummary } from "@/lib/api/types";

/** Marcas de acentuacao separadas pela decomposicao NFD. */
const DIACRITICS = /[̀-ͯ]/g;

/**
 * Normaliza um nome para comparacao: minusculas, sem acento e sem hifen.
 * Assim `mr-mime` e achado tanto por "mr" quanto por "mime".
 */
function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(DIACRITICS, "").replace(/-/g, "");
}

/**
 * Filtra por substring do nome (nao por prefixo: buscar "chu" acha "pikachu").
 *
 * Roda em memoria sobre o catalogo cacheado — a PokeAPI nao tem endpoint de
 * busca por substring, e consultar a cada tecla seria chamada desnecessaria.
 */
export function filterByName<T extends Pick<PokemonSummary, "name">>(items: T[], q: string): T[] {
  const term = normalize(q.trim());
  if (term === "") return items;

  return items.filter((item) => normalize(item.name).includes(term));
}
