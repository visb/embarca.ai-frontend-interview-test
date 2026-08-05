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

function setup(initialUrl = "/", types: PokemonType[] = TYPES) {
  navigations.length = 0;
  window.history.replaceState(null, "", initialUrl);

  const user = userEvent.setup();

  render(
    // O "Limpar filtros" entra junto: o reset otimista do controle vem dele.
    <FilterTransitionProvider>
      <TypeFilter types={types} />
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

  test("com varios tipos na URL o gatilho lista os nomes", () => {
    setup("/?type=fire,water");

    // Nome do tipo diz mais que a contagem: "2 tipos" obriga a abrir o dropdown
    // para saber quais.
    expect(trigger()).toHaveTextContent("fire, water");
  });

  test("quando os nomes nao cabem, o gatilho mostra os dois primeiros e conta o resto", () => {
    setup("/?type=grass,fire,water,electric");

    // Ordem canonica: grass, fire, water, electric.
    expect(trigger()).toHaveTextContent("grass, fire +2 tipos");
  });

  test("tres nomes curtos ainda cabem: o corte so entra quando estoura", () => {
    setup("/?type=grass,fire,water");

    expect(trigger()).toHaveTextContent("grass, fire, water");
  });

  test("um unico tipo restante e contado no singular", () => {
    const longos: PokemonType[] = [{ name: "fighting" }, { name: "electric" }, { name: "psychic" }];

    setup("/?type=fighting,electric,psychic", longos);

    expect(trigger()).toHaveTextContent("fighting, electric +1 tipo");
  });

  test("dois nomes longos aparecem inteiros, sem virar contagem", () => {
    const longos: PokemonType[] = [{ name: "fighting" }, { name: "electric" }];

    setup("/?type=fighting,electric", longos);

    // Cortar com dois selecionados daria "+0 tipos".
    expect(trigger()).toHaveTextContent("fighting, electric");
  });

  test("abrir oferece uma caixa por tipo, com as da URL ja marcadas", async () => {
    const user = setup("/?type=fire");

    await user.click(trigger());

    expect(screen.getAllByRole("checkbox")).toHaveLength(TYPES.length);
    expect(option("fire")).toBeChecked();
    expect(option("water")).not.toBeChecked();
  });

  test("marcar uma caixa recarrega a lista na hora, sem fechar o dropdown", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("fire"));

    // O dropdown continua aberto: quem esta marcando ve o efeito de cada
    // escolha em vez de descobrir tudo no fim.
    expect(navigations).toEqual(["/?type=fire"]);
    expect(option("fire")).toBeChecked();
  });

  test("cada caixa marcada acumula no conjunto ja filtrado", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("fire"));
    await user.click(option("water"));

    expect(navigations).toEqual(["/?type=fire", "/?type=fire,water"]);
    expect(option("fire")).toBeChecked();
    expect(option("water")).toBeChecked();
  });

  test("a ordem na URL e a do catalogo, nao a de clique", async () => {
    const user = setup();

    await user.click(trigger());
    await user.click(option("water"));
    await user.click(option("fire"));

    // `fire` vem antes de `water` em `TYPES`. Sem a ordem canonica, clicar na
    // ordem inversa geraria outra URL para o mesmo resultado.
    expect(new URLSearchParams(window.location.search).get("type")).toBe("fire,water");
  });

  test("abrir e fechar sem mexer em nada nao navega", async () => {
    const user = setup("/?type=fire");

    await user.click(trigger());
    await close(user);

    // Quem navega e a caixa, nao o fechamento: sem mexer em nada, nada muda
    // para o servidor dizer.
    expect(navigations).toEqual([]);
  });

  test("desmarcar tira o filtro da URL na hora", async () => {
    const user = setup("/?type=fire");

    await user.click(trigger());
    await user.click(option("fire"));

    expect(window.location.search).toBe("");
    expect(navigations).toEqual(["/"]);
  });

  test("filtrar preserva a busca e volta para o inicio da lista", async () => {
    const user = setup("/?q=pika&page=2");

    await user.click(trigger());
    await user.click(option("electric"));

    const params = new URLSearchParams(window.location.search);

    expect(params.get("q")).toBe("pika");
    expect(params.get("type")).toBe("electric");
    // Sem isso o usuario filtraria e cairia numa fatia que o novo conjunto nem tem.
    expect(params.get("page")).toBeNull();
  });

  test("limpar tipos desmarca tudo e recarrega, sem fechar o dropdown", async () => {
    const user = setup("/?type=fire,water");

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Limpar tipos" }));

    expect(option("fire")).not.toBeChecked();
    expect(option("water")).not.toBeChecked();
    expect(navigations).toEqual(["/"]);
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
    expect(trigger()).toHaveTextContent("fire, water");

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
