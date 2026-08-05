import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { PokemonCard } from "@/components/pokemon/PokemonCard";
import { makeSummary } from "@/test/fixtures/pokemon";

describe("PokemonCard", () => {
  test("o card inteiro e um link achavel pelo nome do pokemon", () => {
    render(<PokemonCard pokemon={makeSummary()} />);

    expect(screen.getByRole("link", { name: /pikachu/i })).toHaveAttribute(
      "href",
      "/pokemon/pikachu",
    );
  });

  test("o nome acessivel do link inclui o numero da pokedex", () => {
    render(<PokemonCard pokemon={makeSummary()} />);

    expect(screen.getByRole("link", { name: "Pikachu, numero 25" })).toBeInTheDocument();
  });

  test("mostra o numero da pokedex formatado", () => {
    render(<PokemonCard pokemon={makeSummary({ id: 25 })} />);

    expect(screen.getByText("#0025")).toBeInTheDocument();
  });

  test("mostra o nome capitalizado, sem o hifen da API", () => {
    render(<PokemonCard pokemon={makeSummary({ id: 122, name: "mr-mime" })} />);

    expect(screen.getByRole("heading", { level: 2, name: "Mr Mime" })).toBeInTheDocument();
  });

  test("a imagem e decorativa: o leitor de tela nao anuncia o pokemon duas vezes", () => {
    render(<PokemonCard pokemon={makeSummary()} />);

    // O nome ja vem do `aria-label` do link; uma imagem com `alt` repetiria tudo.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pikachu, numero 25" })).toBeInTheDocument();
  });

  test("pokemon sem sprite avisa a ausencia em vez de deixar buraco", () => {
    render(<PokemonCard pokemon={makeSummary({ spriteUrl: null })} />);

    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
  });

  test("mostra um badge para cada tipo do pokemon", () => {
    render(<PokemonCard pokemon={makeSummary({ types: ["electric"] })} />);

    expect(screen.getByText("electric")).toBeInTheDocument();
  });

  test("pokemon de tipo duplo mostra os dois badges", () => {
    render(
      <PokemonCard
        pokemon={makeSummary({ id: 1, name: "bulbasaur", types: ["grass", "poison"] })}
      />,
    );

    expect(screen.getByText("grass")).toBeInTheDocument();
    expect(screen.getByText("poison")).toBeInTheDocument();
  });

  test("o link leva a busca e o filtro atuais para o detalhe saber para onde voltar", () => {
    render(<PokemonCard pokemon={makeSummary()} listingQuery="q=pika&type=electric&page=2" />);

    expect(screen.getByRole("link", { name: /pikachu/i })).toHaveAttribute(
      "href",
      "/pokemon/pikachu?q=pika&type=electric&page=2",
    );
  });
});
