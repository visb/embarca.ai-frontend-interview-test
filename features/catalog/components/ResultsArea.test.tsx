import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ResultsArea } from "@/features/catalog/components/ResultsArea";
import {
  FilterTransitionProvider,
  useFilterTransition,
} from "@/components/shared/FilterTransition";

// Fronteira do framework: nenhum teste aqui e sobre navegar.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {} }),
}));

/**
 * Consumidor minimo do contexto.
 *
 * O `pending` de uma navegacao de verdade so dura enquanto o Server Component
 * nao responde — intervalo que nao existe no jsdom, onde o router e um duble
 * sincrono. Quem cobre "esmaeceu enquanto a lista recarregava" ponta a ponta e
 * o Playwright; aqui o alvo e o contrato do proprio `ResultsArea`: pending
 * ligado, lista marcada como desatualizada.
 */
function Controls() {
  const { signalPending, navigate } = useFilterTransition();

  return (
    <>
      <button type="button" onClick={signalPending}>
        digitar
      </button>
      <button type="button" onClick={() => navigate("/")}>
        navegar
      </button>
    </>
  );
}

function setup() {
  const user = userEvent.setup();

  render(
    <FilterTransitionProvider>
      <Controls />
      <ResultsArea>
        <p>lista</p>
      </ResultsArea>
    </FilterTransitionProvider>,
  );

  return user;
}

/** O container da grade — sem papel proprio: o que interessa e o `aria-busy`. */
const results = () => screen.getByText("lista").parentElement as HTMLElement;

describe("ResultsArea", () => {
  test("em repouso a lista na tela e a lista de verdade", () => {
    setup();

    expect(results()).toHaveAttribute("aria-busy", "false");
  });

  test("com filtro em andamento a lista exibida e anunciada como desatualizada", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "digitar" }));

    // `aria-busy` e o que conta para quem usa leitor de tela: o esmaecimento
    // sozinho nao diz nada.
    expect(results()).toHaveAttribute("aria-busy", "true");
  });

  test("terminada a navegacao a lista volta a valer", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "digitar" }));
    await user.click(screen.getByRole("button", { name: "navegar" }));

    expect(results()).toHaveAttribute("aria-busy", "false");
  });

  test("os cards continuam sendo do servidor: o wrapper so muda o container", () => {
    setup();

    // Nada aqui re-renderiza o conteudo — se um dia passar a renderizar, a
    // fronteira cliente/servidor mudou sem ninguem pedir.
    expect(screen.getByText("lista")).toBeInTheDocument();
  });
});
