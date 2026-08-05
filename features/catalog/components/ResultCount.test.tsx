import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ResultCount } from "@/features/catalog/components/ResultCount";

/**
 * Teste de fumaca da pipeline de unit: componente sincrono, alias `@/`,
 * ambiente jsdom e os matchers do `jest-dom` carregados pelo `setupFiles`.
 */
test("anuncia o total numa regiao aria-live", () => {
  render(<ResultCount total={20} />);

  const label = screen.getByText("20 pokemons encontrados");
  expect(label).toBeInTheDocument();
  expect(label).toHaveAttribute("aria-live", "polite");
});

test("mostra o parcial enquanto a lista nao acabou", () => {
  render(<ResultCount total={20} shown={9} />);

  expect(screen.getByText("Mostrando 9 de 20 pokemons")).toBeInTheDocument();
});
