import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { FilterTransitionProvider } from "@/components/search/FilterTransition";
import { TypeFilter } from "@/components/search/TypeFilter";
import type { PokemonType } from "@/lib/api/types";

const { navigations } = vi.hoisted(() => ({ navigations: [] as string[] }));

// Fronteira do framework: o `replace` alimenta a location do jsdom para a
// assercao poder ser sobre a URL resultante.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    replace: (href: string) => {
      navigations.push(href);
      window.history.replaceState(null, "", href);
    },
  }),
}));

const TYPES: PokemonType[] = [
  { name: "grass" },
  { name: "fire" },
  { name: "water" },
  { name: "electric" },
];

function setup(initialUrl = "/") {
  navigations.length = 0;
  window.history.replaceState(null, "", initialUrl);

  const user = userEvent.setup();

  render(
    <FilterTransitionProvider>
      <TypeFilter types={TYPES} />
    </FilterTransitionProvider>,
  );

  return user;
}

const select = () => screen.getByLabelText("Filtrar por tipo");

beforeEach(() => {
  navigations.length = 0;
});

describe("TypeFilter", () => {
  test("o controle e alcancavel pelo rotulo visivel", () => {
    setup();

    expect(select()).toBeInTheDocument();
  });

  test("oferece uma opcao por tipo, mais a saida para a lista completa", () => {
    setup();

    const opcoes = screen.getAllByRole("option");

    expect(opcoes).toHaveLength(TYPES.length + 1);
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      "Todos os tipos",
      "grass",
      "fire",
      "water",
      "electric",
    ]);
  });

  test("o valor inicial vem da URL", () => {
    setup("/?type=fire");

    expect(select()).toHaveValue("fire");
  });

  test("URL sem filtro comeca em todos os tipos", () => {
    setup();

    expect(select()).toHaveValue("");
  });

  test("escolher um tipo leva a URL para a listagem filtrada", async () => {
    const user = setup();

    await user.selectOptions(select(), "water");

    expect(window.location.search).toBe("?type=water");
  });

  test("filtrar a partir de uma pagina avancada volta para o inicio da lista", async () => {
    const user = setup("/?page=3");

    await user.selectOptions(select(), "water");

    expect(window.location.search).toBe("?type=water");
  });

  test("filtrar preserva a busca ja digitada", async () => {
    const user = setup("/?q=pika&page=2");

    await user.selectOptions(select(), "electric");

    const params = new URLSearchParams(window.location.search);

    expect(params.get("q")).toBe("pika");
    expect(params.get("type")).toBe("electric");
    expect(params.get("page")).toBeNull();
  });

  test("voltar para todos os tipos tira o filtro da URL", async () => {
    const user = setup("/?type=fire");

    await user.selectOptions(select(), "");

    expect(window.location.search).toBe("");
    expect(navigations).toEqual(["/"]);
  });

  test("a selecao aparece imediatamente, sem esperar o servidor responder", async () => {
    const user = setup();

    await user.selectOptions(select(), "fire");

    expect(select()).toHaveValue("fire");
  });

  test("o controle nunca e bloqueado durante a navegacao", async () => {
    const user = setup();

    await user.selectOptions(select(), "fire");

    expect(select()).toBeEnabled();
  });
});
