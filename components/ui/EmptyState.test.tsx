import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, test } from "vitest";

import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  test("anuncia o titulo do estado vazio", () => {
    render(<EmptyState title="Nenhum pokemon encontrado" />);

    expect(screen.getByText("Nenhum pokemon encontrado")).toBeInTheDocument();
  });

  test("explica o motivo quando a descricao e fornecida", () => {
    render(<EmptyState title="Nenhum pokemon encontrado" description='Nada combina com "zzz".' />);

    expect(screen.getByText('Nada combina com "zzz".')).toBeInTheDocument();
  });

  test("sem descricao mostra so o titulo", () => {
    render(<EmptyState title="Nenhum pokemon encontrado" />);

    expect(screen.queryByText(/Nada combina/)).not.toBeInTheDocument();
  });

  test("oferece a saida quando uma acao e passada", () => {
    render(
      <EmptyState title="Nenhum pokemon encontrado">
        <Link href="/">Limpar filtros</Link>
      </EmptyState>,
    );

    expect(screen.getByRole("link", { name: "Limpar filtros" })).toHaveAttribute("href", "/");
  });

  test("sem acao nao renderiza botao orfao", () => {
    render(<EmptyState title="Nenhum pokemon encontrado" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
