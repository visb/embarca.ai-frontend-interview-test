import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ClearFiltersAction } from "@/components/search/ClearFiltersAction";
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
    // O "Limpar filtros" entra junto: o reset otimista do controle vem dele.
    <FilterTransitionProvider>
      <TypeFilter types={TYPES} />
      <ClearFiltersAction />
    </FilterTransitionProvider>,
  );

  return user;
}

const trigger = () => screen.getByRole("button", { name: "Filtrar por tipo" });
const option = (name: string) => screen.getByRole("checkbox", { name });
const clearFilters = () => screen.getByRole("link", { name: "Limpar filtros" });

/** Fecha o popover como o usuario fecha: Esc. E o que dispara a navegacao. */
async function close(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard("{Escape}");
}

beforeEach(() => {
  navigations.length = 0;
});

describe("TypeFilter", () => {
  test("o controle e alcancavel pelo rotulo, mesmo com o texto do gatilho mudando", () => {
    setup();

    // Nome acessivel fixo: o rotulo visivel varia com a selecao, e um nome que
    // muda faz o leitor de tela anunciar um controle diferente a cada mexida.
    expect(trigger()).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por tipo")).toBe(trigger());
  });

  test("sem filtro o gatilho diz que nada esta filtrado", () => {
    setup();

    expect(trigger()).toHaveTextContent("Todos os tipos");
  });

  test("com um tipo na URL o gatilho mostra o tipo", () => {
    setup("/?type=fire");

    expect(trigger()).toHaveTextContent("fire");
  });

  test("com varios tipos na URL o gatilho conta em vez de listar", () => {
    setup("/?type=fire,water");

    expect(trigger()).toHaveTextContent("2 tipos");
  });

  test("abrir oferece uma caixa por tipo, com as da URL ja marcadas", async () => {
    const user = setup("/?type=fire");

    await user.click(trigger());

    expect(screen.getAllByRole("checkbox")).toHaveLength(TYPES.length);
    expect(option("fire")).toBeChecked();
    expect(option("water")).not.toBeChecked();
  });

  test("marcar caixas nao navega enquanto o dropdown esta aberto", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("fire"));
    await user.click(option("water"));

    // Navegar por caixa seriam quatro round-trips e quatro remounts da lista
    // para quem marca quatro tipos.
    expect(navigations).toEqual([]);
    expect(option("fire")).toBeChecked();
    expect(option("water")).toBeChecked();
  });

  test("fechar com o conjunto alterado navega uma vez so", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("fire"));
    await user.click(option("water"));
    await close(user);

    expect(navigations).toEqual(["/?type=fire,water"]);
  });

  test("a ordem na URL e a do catalogo, nao a de clique", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("water"));
    await user.click(option("fire"));
    await close(user);

    // `fire` vem antes de `water` em `TYPES`. Sem a ordem canonica, clicar na
    // ordem inversa geraria outra URL para o mesmo resultado.
    expect(new URLSearchParams(window.location.search).get("type")).toBe("fire,water");
  });

  test("fechar sem mexer em nada nao navega", async () => {
    const user = setup("/?type=fire");

    await user.click(trigger());
    await close(user);

    expect(navigations).toEqual([]);
  });

  test("desmarcar tudo e fechar tira o filtro da URL", async () => {
    const user = setup("/?type=fire");

    await user.click(trigger());
    await user.click(option("fire"));
    await close(user);

    expect(window.location.search).toBe("");
    expect(navigations).toEqual(["/"]);
  });

  test("filtrar preserva a busca e volta para o inicio da lista", async () => {
    const user = setup("/?q=pika&page=2");

    await user.click(trigger());
    await user.click(option("electric"));
    await close(user);

    const params = new URLSearchParams(window.location.search);

    expect(params.get("q")).toBe("pika");
    expect(params.get("type")).toBe("electric");
    // Sem isso o usuario filtraria e cairia numa fatia que o novo conjunto nem tem.
    expect(params.get("page")).toBeNull();
  });

  test("limpar tipos desmarca tudo sem fechar o dropdown", async () => {
    const user = setup("/?type=fire,water");

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Limpar tipos" }));

    expect(option("fire")).not.toBeChecked();
    expect(option("water")).not.toBeChecked();
    expect(navigations).toEqual([]);
  });

  test("sem nada marcado nao ha o que limpar", async () => {
    const user = setup();

    await user.click(trigger());

    expect(screen.queryByRole("button", { name: "Limpar tipos" })).not.toBeInTheDocument();
  });

  test("a selecao aparece imediatamente, sem esperar o servidor responder", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("fire"));
    await close(user);

    expect(trigger()).toHaveTextContent("fire");
  });

  test("URL mudando por fora re-sincroniza o controle", async () => {
    const user = setup("/?type=fire");

    await user.click(trigger());
    expect(option("fire")).toBeChecked();
    await close(user);

    // Voltar do navegador: a URL manda de novo.
    window.history.replaceState(null, "", "/?type=water");
    await user.click(trigger());

    expect(option("fire")).not.toBeChecked();
    expect(option("water")).toBeChecked();
  });

  test("limpar filtros zera o controle antes de a URL mudar", async () => {
    const user = setup("/?type=fire,water");
    expect(trigger()).toHaveTextContent("2 tipos");

    await user.click(clearFilters());

    expect(trigger()).toHaveTextContent("Todos os tipos");
  });

  test("Esc fecha o dropdown e devolve o foco ao gatilho", async () => {
    const user = setup();

    await user.click(trigger());
    expect(screen.getAllByRole("checkbox")).toHaveLength(TYPES.length);

    await close(user);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  test("o gatilho nunca e bloqueado durante a navegacao", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("fire"));
    await close(user);

    expect(trigger()).toBeEnabled();
  });
});
