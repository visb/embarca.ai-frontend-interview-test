import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ClearFiltersLink } from "@/components/search/ClearFiltersLink";
import { FilterTransitionProvider } from "@/components/search/FilterTransition";

const { navigations } = vi.hoisted(() => ({ navigations: [] as string[] }));

// Fronteira do framework. O `replace` **nao** escreve na location de proposito:
// e assim que a transicao se comporta de verdade — a URL antiga fica no ar
// enquanto o servidor nao responde, que e o intervalo testado aqui.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    replace: (href: string) => {
      navigations.push(href);
    },
  }),
}));

function setup(initialUrl = "/") {
  navigations.length = 0;
  window.history.replaceState(null, "", initialUrl);

  const user = userEvent.setup();

  render(
    <FilterTransitionProvider>
      <ClearFiltersLink />
    </FilterTransitionProvider>,
  );

  return user;
}

const link = () => screen.queryByRole("link", { name: "Limpar filtros" });

beforeEach(() => {
  navigations.length = 0;
});

describe("ClearFiltersLink", () => {
  test("sem filtro ativo nao ha o que limpar, e nada e renderizado", () => {
    setup();

    // Um botao de limpar sempre visivel sugere um estado que nao existe.
    expect(link()).not.toBeInTheDocument();
  });

  test("com busca ativa aparece apontando para a listagem limpa", () => {
    setup("/?q=char");

    expect(link()).toHaveAttribute("href", "/");
  });

  test("com filtro de tipo ativo aparece do mesmo jeito", () => {
    setup("/?type=fire");

    expect(link()).toHaveAttribute("href", "/");
  });

  test("some no clique, sem esperar a URL commitar", async () => {
    const user = setup("/?q=char");

    await user.click(link() as HTMLElement);

    // A URL ainda tem `?q=char` — a transicao a segura. Deixar o link clicavel
    // ate la ofereceria "limpar" sobre uma lista que ja esta sendo limpa.
    expect(window.location.search).toBe("?q=char");
    expect(navigations).toEqual(["/"]);
    expect(link()).not.toBeInTheDocument();
  });
});
