import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { PendingIndicator } from "@/components/ui/PendingIndicator";

describe("PendingIndicator", () => {
  test("nao entra no nome acessivel do controle que o hospeda", () => {
    render(
      <button type="button">
        Carregar mais
        <PendingIndicator pending />
      </button>,
    );

    // O spinner e decorativo: quem anuncia a mudanca e o `aria-live` do
    // contador. Se ele vazasse para o nome, o botao viraria "Carregar mais ...".
    expect(screen.getByRole("button", { name: "Carregar mais" })).toBeInTheDocument();
  });

  test("nao e anunciado como estado por leitor de tela", () => {
    render(<PendingIndicator pending />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  test("ligado e desligado ocupam o mesmo no, entao o layout nao pula", () => {
    // Unico ponto da suite que olha o no direto: um elemento decorativo nao tem
    // role nem nome para ser consultado, e a garantia aqui e justamente que ele
    // nao e montado e desmontado.
    const { container, rerender } = render(<PendingIndicator pending={false} />);
    const indicator = container.firstElementChild;

    expect(indicator).toHaveAttribute("aria-hidden", "true");

    rerender(<PendingIndicator pending />);

    expect(container.firstElementChild).toBe(indicator);
    expect(container.children).toHaveLength(1);
  });
});
