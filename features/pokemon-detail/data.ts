/**
 * Camada de dado do slice de detalhe.
 *
 * A rota e a View passam por aqui em vez de chamar `lib/api` direto: o slice
 * expoe o que precisa e o Model continua trocavel sem varrer componente atras
 * de import.
 */

import { getPokemonByName, getPokemonCatalog } from "@/lib/api/pokemon";
import type { PokemonDetail } from "@/lib/api/types";

/** Detalhe de um pokemon. `null` quando o nome nao existe (ver `getPokemonByName`). */
export function getDetail(name: string): Promise<PokemonDetail | null> {
  return getPokemonByName(name);
}

/**
 * Params das rotas prerenderizadas: um por pokemon do catalogo.
 *
 * Vive aqui, e nao na rota, porque a forma do param e assunto do dominio — a
 * rota so repassa o resultado para o `generateStaticParams`.
 */
export async function listDetailParams(): Promise<{ name: string }[]> {
  const catalog = await getPokemonCatalog();
  return catalog.map((pokemon) => ({ name: pokemon.name }));
}
