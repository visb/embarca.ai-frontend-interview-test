import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { TypeBadge } from "@/components/pokemon/TypeBadge";

describe("TypeBadge", () => {
  test("mostra o nome de um tipo conhecido", () => {
    render(<TypeBadge type="electric" />);

    expect(screen.getByText("electric")).toBeInTheDocument();
  });

  test("tipo desconhecido continua legivel em vez de sumir ou quebrar", () => {
    render(<TypeBadge type="banana" />);

    expect(screen.getByText("banana")).toBeInTheDocument();
  });
});
