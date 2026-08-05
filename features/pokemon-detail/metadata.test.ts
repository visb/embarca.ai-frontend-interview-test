import { describe, expect, test } from "vitest";

import { buildDetailMetadata } from "@/features/pokemon-detail/metadata";
import { toPokemonDetail } from "@/lib/api/mappers";
import { makeDetailResponse } from "@/test/fixtures/pokemon";

/** O detalhe passa pelo mapper — e o mesmo caminho da rota real. */
const detailOf = (overrides = {}) => toPokemonDetail(makeDetailResponse(overrides));

describe("buildDetailMetadata", () => {
  test("nome inexistente nao derruba a rota: metadata neutra", () => {
    expect(buildDetailMetadata(null)).toEqual({ title: "Pokemon nao encontrado" });
  });

  test("o titulo traz o nome formatado e o numero da pokedex", () => {
    expect(buildDetailMetadata(detailOf({ id: 25, name: "mr-mime" })).title).toBe("Mr Mime #0025");
  });

  test("a descricao lista os tipos do pokemon", () => {
    const metadata = buildDetailMetadata(detailOf({ name: "bulbasaur" }));

    expect(metadata.description).toContain("Bulbasaur");
    expect(metadata.description).toContain("electric");
  });

  test("o canonical aponta para a rota do proprio pokemon", () => {
    expect(buildDetailMetadata(detailOf({ name: "pikachu" })).alternates?.canonical).toBe(
      "/pokemon/pikachu",
    );
  });

  test("o sprite vira imagem de Open Graph e de Twitter", () => {
    const metadata = buildDetailMetadata(detailOf());

    expect(metadata.openGraph?.images).toEqual([
      { url: expect.stringContaining("http"), alt: "Pikachu" },
    ]);
    expect(metadata.twitter?.images).toEqual(metadata.openGraph?.images);
  });

  test("pokemon sem sprite nao anuncia imagem nenhuma", () => {
    const metadata = buildDetailMetadata(
      detailOf({ sprites: { front_default: null, other: null } }),
    );

    expect(metadata.openGraph?.images).toBeUndefined();
    expect(metadata.twitter?.images).toBeUndefined();
  });
});
