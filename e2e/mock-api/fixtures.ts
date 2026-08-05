/**
 * Catalogo sintetico servido pelo mock da PokeAPI.
 *
 * Existe para a suite e2e ser deterministica: o `pnpm build` faz 1 + 100
 * requisicoes a PokeAPI e o README ja avisa que ele falha se a API oscilar — a
 * suite inteira herdaria essa instabilidade. Aqui o catalogo e sempre o mesmo,
 * roda offline e permite encenar 500 e 404, que sao requisito e nao tem como
 * ser produzidos de fora do processo do Next.
 *
 * Os tipos vem de `lib/api/types` de proposito (import so-de-tipo, apagado em
 * runtime): se o contrato que o app consome mudar, e esta fixture que quebra no
 * `typecheck`, e nao um teste em runtime com mensagem obscura.
 */

import type {
  PokemonDetailResponse,
  PokemonListResponse,
  TypeListResponse,
} from "../../lib/api/types";

/** Mesmo recorte do app (`CATALOG_SIZE`), replicado para o mock nao importar `next/cache`. */
export const MOCK_CATALOG_SIZE = 100;

/** Nome cujo detalhe responde 500 em `MOCK_MODE=fail-detail`. Precisa estar no catalogo. */
export const FAILING_DETAIL_NAME = "charizard";

/** Nome que nao existe no catalogo — 404 em qualquer modo. */
export const UNKNOWN_NAME = "nao-existe";

export interface MockPokemon {
  id: number;
  name: string;
  types: string[];
  /** Decimetros, como a PokeAPI. */
  height: number;
  /** Hectogramas, como a PokeAPI. */
  weight: number;
  abilities: Array<{ name: string; isHidden: boolean }>;
  moves: string[];
}

/**
 * Pokemons com nome, id, tipo, altura e peso **reais**.
 *
 * Sao os que os testes citam pelo nome. Manter os valores reais e o que permite
 * a mesma assercao valer contra a PokeAPI de verdade (`PW_LIVE=1`).
 */
const NAMED_POKEMON: MockPokemon[] = [
  {
    id: 1,
    name: "bulbasaur",
    types: ["grass", "poison"],
    height: 7,
    weight: 69,
    abilities: [
      { name: "overgrow", isHidden: false },
      { name: "chlorophyll", isHidden: true },
    ],
    moves: ["razor-wind", "swords-dance", "cut", "bind", "vine-whip", "headbutt"],
  },
  {
    id: 4,
    name: "charmander",
    types: ["fire"],
    height: 6,
    weight: 85,
    abilities: [
      { name: "blaze", isHidden: false },
      { name: "solar-power", isHidden: true },
    ],
    moves: ["mega-punch", "fire-punch", "thunder-punch", "scratch", "swords-dance", "cut"],
  },
  {
    id: 5,
    name: "charmeleon",
    types: ["fire"],
    height: 11,
    weight: 190,
    abilities: [
      { name: "blaze", isHidden: false },
      { name: "solar-power", isHidden: true },
    ],
    moves: ["mega-punch", "fire-punch", "thunder-punch", "scratch", "swords-dance", "cut"],
  },
  {
    id: 6,
    name: "charizard",
    types: ["fire", "flying"],
    height: 17,
    weight: 905,
    abilities: [
      { name: "blaze", isHidden: false },
      { name: "solar-power", isHidden: true },
    ],
    moves: ["mega-punch", "fire-punch", "thunder-punch", "scratch", "swords-dance", "cut"],
  },
  {
    id: 7,
    name: "squirtle",
    types: ["water"],
    height: 5,
    weight: 90,
    abilities: [
      { name: "torrent", isHidden: false },
      { name: "rain-dish", isHidden: true },
    ],
    moves: ["mega-punch", "pay-day", "ice-punch", "headbutt", "tackle", "body-slam"],
  },
  {
    id: 25,
    name: "pikachu",
    types: ["electric"],
    height: 4,
    weight: 60,
    abilities: [
      { name: "static", isHidden: false },
      { name: "lightning-rod", isHidden: true },
    ],
    moves: ["mega-punch", "pay-day", "thunder-punch", "slam", "double-slap", "headbutt"],
  },
  {
    /*
      Unico nome hifenizado do catalogo: e o alvo da busca que precisa atravessar
      o hifen (`?q=mr` acha `mr-mime`). O id 122 e o real — fora da faixa 1..99
      dos demais, porque na PokeAPI de verdade `mr-mime` esta alem dos 100
      primeiros. Por isso o teste que depende dele nao roda em `PW_LIVE=1`.
    */
    id: 122,
    name: "mr-mime",
    types: ["psychic", "fairy"],
    height: 13,
    weight: 545,
    abilities: [
      { name: "soundproof", isHidden: false },
      { name: "filter", isHidden: false },
    ],
    moves: ["pound", "double-slap", "mega-punch", "fire-punch", "ice-punch", "thunder-punch"],
  },
];

/**
 * Tipos do preenchimento. Nenhum deles e `fire`, `electric`, `psychic` ou
 * `fairy`: assim o conjunto filtrado por esses tipos e exatamente o dos
 * pokemons nomeados acima, e o total filtrado vira constante conferivel.
 */
const FILLER_TYPES = [
  ["normal"],
  ["water"],
  ["bug", "flying"],
  ["poison"],
  ["ground"],
  ["rock"],
  ["ghost"],
  ["ice"],
  ["dragon"],
  ["steel"],
];

/**
 * Preenchimento ate 100. O nome nao pode conter nenhum dos termos buscados
 * pelos testes ("char", "pika", "mr", "zzzz") — senao um filtro passaria a
 * depender de quantos itens sinteticos existem.
 */
function makeFiller(id: number): MockPokemon {
  return {
    id,
    name: `mockemon-${id}`,
    types: FILLER_TYPES[id % FILLER_TYPES.length],
    height: 10,
    weight: 100,
    abilities: [
      { name: "run-away", isHidden: false },
      { name: "keen-eye", isHidden: true },
    ],
    moves: ["tackle", "growl", "scratch", "pound", "harden", "bide"],
  };
}

function buildCatalog(): MockPokemon[] {
  const byId = new Map(NAMED_POKEMON.map((pokemon) => [pokemon.id, pokemon]));
  // Nomeados com id acima da faixa sequencial (mr-mime, #122) ocupam o fim da lista.
  const outOfRange = NAMED_POKEMON.filter((pokemon) => pokemon.id > MOCK_CATALOG_SIZE);
  const sequentialSize = MOCK_CATALOG_SIZE - outOfRange.length;

  const sequential = Array.from({ length: sequentialSize }, (_, index) => {
    const id = index + 1;
    return byId.get(id) ?? makeFiller(id);
  });

  return [...sequential, ...outOfRange];
}

/** Catalogo completo, na ordem em que `GET /pokemon?limit=100` o devolve. */
export const MOCK_CATALOG: MockPokemon[] = buildCatalog();

/**
 * Tipos como a PokeAPI os devolve, incluindo os tres que nao pertencem a
 * nenhum pokemon jogavel (`stellar`, `unknown`, `shadow`) — o app filtra dois
 * deles, e a fixture so mente se esconder o que a API manda.
 */
const TYPE_NAMES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
  "stellar",
  "unknown",
  "shadow",
];

export function findPokemon(key: string): MockPokemon | undefined {
  const normalized = decodeURIComponent(key).toLowerCase();
  return MOCK_CATALOG.find(
    (pokemon) => pokemon.name === normalized || String(pokemon.id) === normalized,
  );
}

/** Sprite servido pelo proprio mock: evita `next/image` sair para a internet no meio do teste. */
export function spriteUrl(baseUrl: string, id: number): string {
  return `${baseUrl}/sprites/${id}.png`;
}

export function buildListResponse(
  baseUrl: string,
  limit: number,
  offset: number,
): PokemonListResponse {
  const page = MOCK_CATALOG.slice(offset, offset + limit);

  return {
    count: MOCK_CATALOG.length,
    next: null,
    previous: null,
    // `extractIdFromUrl` le o id do fim da URL, entao a barra final importa.
    results: page.map((pokemon) => ({
      name: pokemon.name,
      url: `${baseUrl}/pokemon/${pokemon.id}/`,
    })),
  };
}

export function buildDetailResponse(baseUrl: string, pokemon: MockPokemon): PokemonDetailResponse {
  return {
    id: pokemon.id,
    name: pokemon.name,
    height: pokemon.height,
    weight: pokemon.weight,
    sprites: {
      front_default: spriteUrl(baseUrl, pokemon.id),
      other: { "official-artwork": { front_default: spriteUrl(baseUrl, pokemon.id) } },
    },
    types: pokemon.types.map((name, index) => ({
      slot: index + 1,
      type: { name, url: `${baseUrl}/type/${name}/` },
    })),
    abilities: pokemon.abilities.map((ability, index) => ({
      slot: index + 1,
      is_hidden: ability.isHidden,
      ability: { name: ability.name, url: `${baseUrl}/ability/${index + 1}/` },
    })),
    moves: pokemon.moves.map((name) => ({ move: { name, url: `${baseUrl}/move/${name}/` } })),
  };
}

export function buildTypeListResponse(baseUrl: string): TypeListResponse {
  return {
    count: TYPE_NAMES.length,
    results: TYPE_NAMES.map((name) => ({ name, url: `${baseUrl}/type/${name}/` })),
  };
}

/** PNG 1x1 valido. Peso irrelevante: o que os testes checam e que a imagem carregou. */
export const PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4f4YBAASZAcwPiojEAAAAAElFTkSuQmCC";
