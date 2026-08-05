import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, test } from "vitest";

import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { makeCatalog } from "@/test/fixtures/pokemon";

describe("PokemonGrid", () => {
  test("cada pokemon da lista vira um link navegavel", () => {
    render(<PokemonGrid items={makeCatalog(6)} />);

    expect(screen.getAllByRole("link")).toHaveLength(6);
  });

  test("lista vazia mostra o estado vazio e nenhum card", () => {
    render(<PokemonGrid items={[]} />);

    expect(screen.getByText("Nenhum pokemon encontrado")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  test("o estado vazio aceita um titulo especifico da busca ou do filtro", () => {
    render(
      <PokemonGrid
        items={[]}
        emptyTitle="Nada por aqui"
        emptyDescription='Nada combina com "zzz".'
      />,
    );

    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
    expect(screen.getByText('Nada combina com "zzz".')).toBeInTheDocument();
  });

  test("o estado vazio oferece a saida quando uma acao e passada", () => {
    render(<PokemonGrid items={[]} emptyAction={<Link href="/">Limpar filtros</Link>} />);

    expect(screen.getByRole("link", { name: "Limpar filtros" })).toBeInTheDocument();
  });

  test("sem acao o estado vazio nao inventa botao", () => {
    render(<PokemonGrid items={[]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("a query da listagem chega em todos os cards", () => {
    render(<PokemonGrid items={makeCatalog(3)} listingQuery="q=pika&page=2" />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("href", expect.stringContaining("?q=pika&page=2"));
    }
  });
});
