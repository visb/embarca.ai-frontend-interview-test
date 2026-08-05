/**
 * Funcoes puras raw -> dominio. Sem I/O de proposito: toda a regra de
 * transformacao vive aqui, isolada da rede.
 */

import type {
  NamedApiResource,
  PokemonDetail,
  PokemonDetailResponse,
  PokemonSprites,
  PokemonSummary,
  PokemonType,
} from "./types";

/** Quantos movimentos a pagina de detalhe exibe (requisito: "ate 5"). */
export const MAX_MOVES = 5;

/**
 * Extrai o ID numerico de uma URL de recurso da PokeAPI.
 * `https://pokeapi.co/api/v2/pokemon/25/` -> `25`
 */
export function extractIdFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url.trim());
  if (!match) {
    throw new Error(`URL de recurso sem ID reconhecivel: ${url}`);
  }
  return Number(match[1]);
}

/**
 * Escolhe a melhor imagem disponivel: arte oficial (alta resolucao) e, quando
 * ela nao existe, o sprite padrao. `null` quando o pokemon nao tem nenhuma.
 */
export function pickSpriteUrl(sprites: PokemonSprites): string | null {
  return sprites.other?.["official-artwork"]?.front_default ?? sprites.front_default ?? null;
}

/** Nomes dos tipos ordenados por `slot` (a API nao garante a ordem). */
export function mapTypes(detail: PokemonDetailResponse): string[] {
  return [...detail.types].sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name);
}

export function toPokemonSummary(detail: PokemonDetailResponse): PokemonSummary {
  return {
    id: detail.id,
    name: detail.name,
    types: mapTypes(detail),
    spriteUrl: pickSpriteUrl(detail.sprites),
  };
}

export function toPokemonDetail(detail: PokemonDetailResponse): PokemonDetail {
  return {
    ...toPokemonSummary(detail),
    height: detail.height,
    weight: detail.weight,
    abilities: detail.abilities.map((entry) => ({
      name: entry.ability.name,
      isHidden: entry.is_hidden,
    })),
    // A PokeAPI nao expoe relevancia de movimento, entao o criterio e explicito:
    // os 5 primeiros na ordem em que a API devolve.
    moves: detail.moves.slice(0, MAX_MOVES).map((entry) => entry.move.name),
  };
}

export function toPokemonType(resource: NamedApiResource): PokemonType {
  return { name: resource.name };
}
