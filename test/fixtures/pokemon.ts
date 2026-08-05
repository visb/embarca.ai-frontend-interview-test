/**
 * Fixtures dos testes: factories, nao constantes congeladas.
 *
 * Cada teste precisa deformar *um* campo (sprite `null`, 200 movimentos, tipo
 * duplo) e um objeto literal por teste esconderia qual campo e o sujeito. Com
 * override, o que aparece na chamada e exatamente o que esta sendo testado.
 *
 * Os tipos vem de `lib/api/types` de proposito: se o contrato da API mudar, e
 * a fixture que quebra no `typecheck`, nao o teste em runtime.
 */

import type {
  PokemonAbilitySlot,
  PokemonDetailResponse,
  PokemonMoveSlot,
  PokemonSprites,
  PokemonSummary,
  PokemonTypeSlot,
} from "@/lib/api/types";

const SPRITE_HOST = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/** URL no host que o `next.config.ts` autoriza — `next/image` recusa os demais. */
export function spriteUrl(id: number): string {
  return `${SPRITE_HOST}/${id}.png`;
}

export function officialArtworkUrl(id: number): string {
  return `${SPRITE_HOST}/other/official-artwork/${id}.png`;
}

/** Bloco de sprites completo. Passe `null` em qualquer nivel para deformar. */
export function makeSprites(id: number): PokemonSprites {
  return {
    front_default: spriteUrl(id),
    other: { "official-artwork": { front_default: officialArtworkUrl(id) } },
  };
}

/** `n` slots de movimento nomeados `move-1..move-n`, na ordem. */
export function makeMoveSlots(n: number): PokemonMoveSlot[] {
  return Array.from({ length: n }, (_, index) => ({
    move: { name: `move-${index + 1}`, url: `https://pokeapi.co/api/v2/move/${index + 1}/` },
  }));
}

/** Slots de tipo ja numerados na ordem em que sao passados. */
export function makeTypeSlots(names: string[]): PokemonTypeSlot[] {
  return names.map((name, index) => ({
    slot: index + 1,
    type: { name, url: `https://pokeapi.co/api/v2/type/${index + 1}/` },
  }));
}

export function makeAbilitySlots(
  entries: Array<{ name: string; isHidden?: boolean }>,
): PokemonAbilitySlot[] {
  return entries.map((entry, index) => ({
    slot: index + 1,
    is_hidden: entry.isHidden ?? false,
    ability: { name: entry.name, url: `https://pokeapi.co/api/v2/ability/${index + 1}/` },
  }));
}

/** Payload cru da PokeAPI. Default: pikachu completo. */
export function makeDetailResponse(
  overrides: Partial<PokemonDetailResponse> = {},
): PokemonDetailResponse {
  return {
    id: 25,
    name: "pikachu",
    height: 4,
    weight: 60,
    sprites: makeSprites(25),
    types: makeTypeSlots(["electric"]),
    abilities: makeAbilitySlots([{ name: "static" }, { name: "lightning-rod", isHidden: true }]),
    moves: makeMoveSlots(3),
    ...overrides,
  };
}

/** Modelo de dominio do card. Default: pikachu. */
export function makeSummary(overrides: Partial<PokemonSummary> = {}): PokemonSummary {
  return {
    id: 25,
    name: "pikachu",
    types: ["electric"],
    spriteUrl: officialArtworkUrl(25),
    ...overrides,
  };
}

/**
 * Rotacao de tipos do catalogo sintetico. Inclui um tipo duplo, porque e o
 * caso em que filtro por tipo erra com mais facilidade.
 */
const CATALOG_TYPES = [["grass", "poison"], ["fire"], ["water"], ["bug", "flying"], ["electric"]];

/** `n` summaries com IDs 1..n, nomes unicos e tipos variados. */
export function makeCatalog(n: number): PokemonSummary[] {
  return Array.from({ length: n }, (_, index) =>
    makeSummary({
      id: index + 1,
      name: `especie${index + 1}`,
      types: CATALOG_TYPES[index % CATALOG_TYPES.length],
      spriteUrl: officialArtworkUrl(index + 1),
    }),
  );
}
