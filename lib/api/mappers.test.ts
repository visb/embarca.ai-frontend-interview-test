import { describe, expect, test } from "vitest";

import {
  MAX_MOVES,
  extractIdFromUrl,
  mapTypes,
  pickSpriteUrl,
  toPokemonDetail,
  toPokemonSummary,
  toPokemonType,
} from "@/lib/api/mappers";
import {
  makeAbilitySlots,
  makeDetailResponse,
  makeMoveSlots,
  makeSprites,
  makeTypeSlots,
  officialArtworkUrl,
  spriteUrl,
} from "@/test/fixtures/pokemon";

describe("extractIdFromUrl", () => {
  test("tira o ID da URL de recurso da PokeAPI", () => {
    expect(extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/25/")).toBe(25);
  });

  test("aceita a URL sem barra final", () => {
    expect(extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/25")).toBe(25);
  });

  test("nao confunde o ID com outros numeros do caminho", () => {
    expect(extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/151/")).toBe(151);
  });

  test("recusa URL sem ID em vez de devolver NaN silencioso", () => {
    expect(() => extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/pikachu")).toThrow(
      /sem ID reconhecivel/,
    );
  });
});

describe("pickSpriteUrl", () => {
  test("prefere a arte oficial quando ela existe", () => {
    expect(pickSpriteUrl(makeSprites(25))).toBe(officialArtworkUrl(25));
  });

  test("cai no sprite padrao quando a arte oficial e null", () => {
    const sprites = makeSprites(25);

    expect(
      pickSpriteUrl({ ...sprites, other: { "official-artwork": { front_default: null } } }),
    ).toBe(spriteUrl(25));
  });

  test("cai no sprite padrao quando o bloco de arte oficial nem existe", () => {
    expect(pickSpriteUrl({ front_default: spriteUrl(25) })).toBe(spriteUrl(25));
  });

  test("devolve null quando o pokemon nao tem imagem nenhuma", () => {
    expect(pickSpriteUrl({ front_default: null, other: null })).toBeNull();
  });
});

describe("mapTypes", () => {
  test("ordena os tipos por slot mesmo com a API devolvendo fora de ordem", () => {
    const detail = makeDetailResponse({
      types: [
        { slot: 2, type: { name: "poison", url: "https://pokeapi.co/api/v2/type/4/" } },
        { slot: 1, type: { name: "grass", url: "https://pokeapi.co/api/v2/type/12/" } },
      ],
    });

    expect(mapTypes(detail)).toEqual(["grass", "poison"]);
  });

  test("nao muta a lista original de tipos ao ordenar", () => {
    const types = [
      { slot: 2, type: { name: "flying", url: "https://pokeapi.co/api/v2/type/3/" } },
      { slot: 1, type: { name: "normal", url: "https://pokeapi.co/api/v2/type/1/" } },
    ];
    const detail = makeDetailResponse({ types });

    mapTypes(detail);

    expect(types.map((entry) => entry.type.name)).toEqual(["flying", "normal"]);
  });

  test("normaliza a caixa do nome do tipo", () => {
    // O nome do tipo e chave em `filterByType`, em `parseTypeParam` e no
    // cruzamento de `getTypes` com o catalogo: caixa resolvida em cada um deles
    // e um jeito de eles divergirem.
    const detail = makeDetailResponse({ types: makeTypeSlots(["FIRE", "Flying"]) });

    expect(mapTypes(detail)).toEqual(["fire", "flying"]);
  });
});

describe("toPokemonSummary", () => {
  test("reduz o payload cru ao que o card precisa", () => {
    const summary = toPokemonSummary(
      makeDetailResponse({ id: 1, name: "bulbasaur", types: makeTypeSlots(["grass", "poison"]) }),
    );

    expect(summary).toEqual({
      id: 1,
      name: "bulbasaur",
      types: ["grass", "poison"],
      spriteUrl: officialArtworkUrl(25),
    });
  });
});

describe("toPokemonDetail", () => {
  test(`mostra no maximo ${MAX_MOVES} movimentos, preservando a ordem da API`, () => {
    const detail = toPokemonDetail(makeDetailResponse({ moves: makeMoveSlots(200) }));

    expect(detail.moves).toEqual(["move-1", "move-2", "move-3", "move-4", "move-5"]);
  });

  test("lista com menos movimentos que o limite nao estoura", () => {
    const detail = toPokemonDetail(makeDetailResponse({ moves: makeMoveSlots(2) }));

    expect(detail.moves).toEqual(["move-1", "move-2"]);
  });

  test("pokemon sem movimento nenhum vira lista vazia", () => {
    expect(toPokemonDetail(makeDetailResponse({ moves: [] })).moves).toEqual([]);
  });

  test("marca qual habilidade e oculta", () => {
    const detail = toPokemonDetail(
      makeDetailResponse({
        abilities: makeAbilitySlots([
          { name: "static" },
          { name: "lightning-rod", isHidden: true },
        ]),
      }),
    );

    expect(detail.abilities).toEqual([
      { name: "static", isHidden: false },
      { name: "lightning-rod", isHidden: true },
    ]);
  });

  test("carrega altura e peso crus, sem converter", () => {
    const detail = toPokemonDetail(makeDetailResponse({ height: 4, weight: 60 }));

    expect(detail.height).toBe(4);
    expect(detail.weight).toBe(60);
  });
});

describe("toPokemonType", () => {
  test("guarda so o nome: a URL do recurso nao serve para nada no filtro", () => {
    expect(toPokemonType({ name: "fire", url: "https://pokeapi.co/api/v2/type/10/" })).toEqual({
      name: "fire",
    });
  });

  test("normaliza a caixa, igual ao tipo que vem do detalhe", () => {
    // Os dois lados sao comparados em `getTypes`; normalizar so um perderia o
    // tipo em silencio.
    expect(toPokemonType({ name: "Fire", url: "https://pokeapi.co/api/v2/type/10/" })).toEqual({
      name: "fire",
    });
  });
});
