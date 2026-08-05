import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  FilterTransitionProvider,
  useFilterTransition,
} from "@/components/shared/FilterTransition";

const { navigations } = vi.hoisted(() => ({ navigations: [] as string[] }));

// Fronteira do framework. A assercao e sobre o estado que a UI mostra e sobre a
// URL pedida, nunca sobre "o router foi chamado".
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (href: string) => {
      navigations.push(href);
    },
  }),
}));

/**
 * Consumidor minimo do contexto: transforma o `pending` em texto para o teste
 * poder ler o estado do jeito que o usuario leria.
 */
function Harness() {
  const { pending, signalPending, navigate, clearToken, clearFilters } = useFilterTransition();

  return (
    <>
      <p>{pending ? "filtrando" : "ocioso"}</p>
      <p>token {clearToken}</p>
      <button type="button" onClick={signalPending}>
        digitar
      </button>
      <button type="button" onClick={() => navigate("/?q=pika")}>
        navegar
      </button>
      <button type="button" onClick={clearFilters}>
        limpar
      </button>
    </>
  );
}

function setup() {
  navigations.length = 0;
  const user = userEvent.setup();
  render(
    <FilterTransitionProvider>
      <Harness />
    </FilterTransitionProvider>,
  );
  return user;
}

beforeEach(() => {
  navigations.length = 0;
});

describe("FilterTransition", () => {
  test("sem interacao nenhuma a barra comeca ociosa", () => {
    setup();

    expect(screen.getByText("ocioso")).toBeInTheDocument();
  });

  test("a primeira tecla ja liga o pending, antes de qualquer navegacao", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "digitar" }));

    // Os ~300ms de debounce passariam sem sinal nenhum se o pending so
    // acordasse no `replace` — e esse era justamente o intervalo travado.
    expect(screen.getByText("filtrando")).toBeInTheDocument();
    expect(navigations).toEqual([]);
  });

  test("terminada a navegacao o pending desliga", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "digitar" }));
    await user.click(screen.getByRole("button", { name: "navegar" }));

    expect(screen.getByText("ocioso")).toBeInTheDocument();
    expect(navigations).toEqual(["/?q=pika"]);
  });

  test("navegar sem passar pelo debounce tambem termina ocioso", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "navegar" }));

    expect(screen.getByText("ocioso")).toBeInTheDocument();
  });

  test("limpar filtros sai pela mesma transicao, e nao por um link solto", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "limpar" }));

    // A navegacao passa pelo `navigate` do contexto — e o que faz o spinner do
    // filtro e o esmaecimento da grade ligarem tambem ao limpar, em vez de a
    // tela parecer travada ate a arvore nova chegar.
    expect(navigations).toEqual(["/"]);
    expect(screen.getByText("ocioso")).toBeInTheDocument();
  });

  test("cada limpeza produz um token novo, para os controles zerarem de novo", async () => {
    const user = setup();

    expect(screen.getByText("token 0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "limpar" }));
    expect(screen.getByText("token 1")).toBeInTheDocument();

    // Duas limpezas seguidas precisam ser distinguiveis: se o token repetisse,
    // a segunda passaria despercebida pelos espelhos locais.
    await user.click(screen.getByRole("button", { name: "limpar" }));
    expect(screen.getByText("token 2")).toBeInTheDocument();
  });

  test("navegar por busca ou filtro nao mexe no token de limpeza", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "navegar" }));

    expect(screen.getByText("token 0")).toBeInTheDocument();
  });

  test("varias buscas em sequencia nao deixam o pending preso ligado", async () => {
    const user = setup();

    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole("button", { name: "digitar" }));
      await user.click(screen.getByRole("button", { name: "navegar" }));
    }

    expect(screen.getByText("ocioso")).toBeInTheDocument();
    expect(navigations).toHaveLength(3);
  });
});
