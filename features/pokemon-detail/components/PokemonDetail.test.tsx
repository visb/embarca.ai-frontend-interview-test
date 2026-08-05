import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { PokemonDetail } from "@/features/pokemon-detail/components/PokemonDetail";
import { MAX_MOVES, toPokemonDetail } from "@/lib/api/mappers";
import {
  makeAbilitySlots,
  makeDetailResponse,
  makeMoveSlots,
  makeTypeSlots,
} from "@/test/fixtures/pokemon";

/** O detalhe exibido passa pelo mapper — e o mesmo caminho da pagina real. */
const detailOf = (overrides = {}) => toPokemonDetail(makeDetailResponse(overrides));

describe("PokemonDetail", () => {
  test("o nome do pokemon e o titulo da pagina", () => {
    render(<PokemonDetail pokemon={detailOf({ name: "mr-mime" })} />);

    expect(screen.getByRole("heading", { level: 1, name: "Mr Mime" })).toBeInTheDocument();
  });

  test("mostra o numero da pokedex formatado", () => {
    render(<PokemonDetail pokemon={detailOf({ id: 25 })} />);

    expect(screen.getByText("#0025")).toBeInTheDocument();
  });

  test("a ilustracao tem alternativa textual que identifica o pokemon", () => {
    render(<PokemonDetail pokemon={detailOf()} />);

    expect(screen.getByRole("img", { name: "Ilustracao de Pikachu" })).toBeInTheDocument();
  });

  test("pokemon sem ilustracao avisa a ausencia em vez de deixar buraco", () => {
    render(<PokemonDetail pokemon={detailOf({ sprites: { front_default: null, other: null } })} />);

    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("mostra todos os tipos do pokemon", () => {
    render(<PokemonDetail pokemon={detailOf({ types: makeTypeSlots(["grass", "poison"]) })} />);

    expect(screen.getByText("grass")).toBeInTheDocument();
    expect(screen.getByText("poison")).toBeInTheDocument();
  });

  test("converte altura e peso para as unidades que o usuario le", () => {
    render(<PokemonDetail pokemon={detailOf({ height: 4, weight: 60 })} />);

    expect(screen.getByText("0.4 m")).toBeInTheDocument();
    expect(screen.getByText("6.0 kg")).toBeInTheDocument();
  });

  test("lista todas as habilidades e marca qual e oculta", () => {
    render(
      <PokemonDetail
        pokemon={detailOf({
          abilities: makeAbilitySlots([
            { name: "static" },
            { name: "lightning-rod", isHidden: true },
          ]),
        })}
      />,
    );

    const habilidades = within(screen.getByRole("region", { name: "Habilidades" })).getAllByRole(
      "listitem",
    );

    expect(habilidades).toHaveLength(2);
    expect(habilidades[0]).toHaveTextContent("Static");
    expect(habilidades[1]).toHaveTextContent("Lightning Rod");
    expect(habilidades[1]).toHaveTextContent("oculta");
  });

  test("pokemon sem habilidade oculta nao marca nenhuma como oculta", () => {
    render(
      <PokemonDetail pokemon={detailOf({ abilities: makeAbilitySlots([{ name: "static" }]) })} />,
    );

    expect(screen.getByText("Static")).toBeInTheDocument();
    expect(screen.queryByText("oculta")).not.toBeInTheDocument();
  });

  test(`um pokemon com 200 movimentos mostra no maximo ${MAX_MOVES}`, () => {
    render(<PokemonDetail pokemon={detailOf({ moves: makeMoveSlots(200) })} />);

    const movimentos = within(screen.getByRole("region", { name: "Movimentos" })).getAllByRole(
      "listitem",
    );

    expect(movimentos).toHaveLength(MAX_MOVES);
  });

  test("explica o criterio dos movimentos em vez de fingir um ranking", () => {
    render(<PokemonDetail pokemon={detailOf()} />);

    expect(
      screen.getByText(
        `Os ${MAX_MOVES} primeiros movimentos na ordem em que a PokeAPI os devolve.`,
      ),
    ).toBeInTheDocument();
  });

  test("pokemon sem movimento nenhum nao quebra a secao", () => {
    render(<PokemonDetail pokemon={detailOf({ moves: [] })} />);

    expect(
      within(screen.getByRole("region", { name: "Movimentos" })).queryAllByRole("listitem"),
    ).toHaveLength(0);
  });
});
