import { getTypes } from "@/lib/api/pokemon";
import type { PokemonType } from "@/lib/api/types";

/**
 * Tipos oferecidos pelo filtro.
 *
 * Entrada do slice para o Model: a View pede ao slice, nao a `lib/api`. Sem
 * custo de rede — `getTypes` e `"use cache"` e a listagem ja o resolve no mesmo
 * render.
 */
export function getFilterTypes(): Promise<PokemonType[]> {
  return getTypes();
}
