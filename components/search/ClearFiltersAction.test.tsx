import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ClearFiltersAction } from "@/components/search/ClearFiltersAction";
import { FilterTransitionProvider } from "@/components/search/FilterTransition";

const { navigations } = vi.hoisted(() => ({ navigations: [] as string[] }));

// Fronteira do framework: a assercao e sobre a URL pedida e sobre o que o
// navegador ainda pode fazer com o `href`, nunca sobre "o router foi chamado".
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (href: string) => {
      navigations.push(href);
    },
  }),
}));

function setup() {
  navigations.length = 0;
  const user = userEvent.setup();

  render(
    <FilterTransitionProvider>
      <ClearFiltersAction className="pilula" />
    </FilterTransitionProvider>,
  );

  return user;
}

const link = () => screen.getByRole("link", { name: "Limpar filtros" });

beforeEach(() => {
  navigations.length = 0;
});

describe("ClearFiltersAction", () => {
  test("e um link de verdade para a listagem limpa", () => {
    setup();

    // `<a href>` e nao `<button>`: e o que preserva menu de contexto, "copiar
    // endereco" e o funcionamento sem JS.
    expect(link()).toHaveAttribute("href", "/");
  });

  test("a aparencia vem de quem usa, o comportamento nao", () => {
    setup();

    expect(link()).toHaveClass("pilula");
  });

  test("clique simples limpa pelo contexto em vez de deixar o link navegar", async () => {
    const user = setup();

    await user.click(link());

    // A navegacao saiu pelo `router.replace` da transicao — se o `<Link>`
    // tivesse navegado sozinho, nada teria sido registrado aqui.
    expect(navigations).toEqual(["/"]);
  });

  test("Ctrl+clique nao limpa a aba atual", async () => {
    const user = setup();

    await user.keyboard("{Control>}");
    await user.click(link());
    await user.keyboard("{/Control}");

    // Quem pediu para abrir em outra aba nao pediu para limpar esta.
    expect(navigations).toEqual([]);
  });

  test("Cmd+clique nao limpa a aba atual", async () => {
    const user = setup();

    await user.keyboard("{Meta>}");
    await user.click(link());
    await user.keyboard("{/Meta}");

    expect(navigations).toEqual([]);
  });

  test("Shift+clique (nova janela) nao limpa a aba atual", async () => {
    const user = setup();

    await user.keyboard("{Shift>}");
    await user.click(link());
    await user.keyboard("{/Shift}");

    expect(navigations).toEqual([]);
  });

  test("botao do meio nao limpa a aba atual", async () => {
    const user = setup();

    await user.pointer({ target: link(), keys: "[MouseMiddle]" });

    expect(navigations).toEqual([]);
  });

  test("Enter com o link focado limpa, como qualquer clique de teclado", async () => {
    const user = setup();

    await user.tab();
    expect(link()).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(navigations).toEqual(["/"]);
  });
});
