/**
 * Tipos das respostas cruas da PokeAPI e dos modelos de dominio usados pela UI.
 *
 * A separacao e proposital: o formato da API e verboso e instavel, entao nada
 * fora de `lib/api` deve depender dele. Os componentes so conhecem os modelos
 * de dominio no fim deste arquivo.
 */

/** Referencia `{ name, url }` que a PokeAPI usa em toda listagem. */
export interface NamedApiResource {
  name: string;
  url: string;
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedApiResource[];
}

export interface PokemonSprites {
  front_default: string | null;
  other?: {
    "official-artwork"?: {
      front_default: string | null;
    } | null;
  } | null;
}

export interface PokemonTypeSlot {
  slot: number;
  type: NamedApiResource;
}

export interface PokemonAbilitySlot {
  slot: number;
  is_hidden: boolean;
  ability: NamedApiResource;
}

export interface PokemonMoveSlot {
  move: NamedApiResource;
}

export interface PokemonDetailResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: PokemonSprites;
  types: PokemonTypeSlot[];
  abilities: PokemonAbilitySlot[];
  moves: PokemonMoveSlot[];
}

export interface TypeListResponse {
  count: number;
  results: NamedApiResource[];
}

/* -------------------------------------------------------------------------- */
/* Modelos de dominio                                                          */
/* -------------------------------------------------------------------------- */

/** Tipo de pokemon, usado nos badges e nas opcoes do filtro. */
export interface PokemonType {
  name: string;
}

/** O que o card da listagem precisa. Nada alem disso. */
export interface PokemonSummary {
  id: number;
  name: string;
  types: string[];
  spriteUrl: string | null;
}

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
}

/** O que a pagina de detalhe precisa. Estende o resumo. */
export interface PokemonDetail extends PokemonSummary {
  height: number;
  weight: number;
  abilities: PokemonAbility[];
  moves: string[];
}
