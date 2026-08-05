import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { ListStatus } from "@/features/catalog/components/ListStatus";

const noop = () => {};

describe("ListStatus", () => {
  test("lista vazia nao mostra rodape nenhum", () => {
    const { container } = render(
      <ListStatus loading={false} error={false} hasMore={false} total={0} onLoadMore={noop} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("falha ao carregar oferece uma nova tentativa", () => {
    render(<ListStatus loading={false} error hasMore total={40} onLoadMore={noop} />);

    expect(screen.getByText("Nao foi possivel carregar mais pokemons.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  test("clicar em tentar novamente pede a fatia que faltou", async () => {
    // Contador em vez de `expect(mock).toHaveBeenCalled`: o que interessa e que
    // o carregamento foi pedido de novo, e uma vez so.
    let tentativas = 0;
    const user = userEvent.setup();

    render(
      <ListStatus
        loading={false}
        error
        hasMore
        total={40}
        onLoadMore={() => {
          tentativas += 1;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(tentativas).toBe(1);
  });

  test("erro nao oferece o botao de carregar mais, so a nova tentativa", () => {
    render(<ListStatus loading={false} error hasMore total={40} onLoadMore={noop} />);

    expect(screen.queryByRole("button", { name: /Carregar mais/ })).not.toBeInTheDocument();
  });

  test("fim da lista anuncia o total e nao convida a carregar mais", () => {
    render(
      <ListStatus loading={false} error={false} hasMore={false} total={100} onLoadMore={noop} />,
    );

    expect(screen.getByText("100 de 100 pokemons")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("um unico resultado e anunciado no singular", () => {
    render(
      <ListStatus loading={false} error={false} hasMore={false} total={1} onLoadMore={noop} />,
    );

    expect(screen.getByText("1 pokemon no total")).toBeInTheDocument();
  });

  test("com mais fatias por vir oferece o botao de carregar mais", () => {
    render(<ListStatus loading={false} error={false} hasMore total={100} onLoadMore={noop} />);

    expect(screen.getByRole("button", { name: /Carregar mais/ })).toBeInTheDocument();
  });

  test("carregando mantem o botao habilitado, para o foco do teclado nao se perder", () => {
    render(<ListStatus loading error={false} hasMore total={100} onLoadMore={noop} />);

    expect(screen.getByRole("button", { name: /Carregar mais/ })).toBeEnabled();
  });

  test("carregando reserva o espaco da proxima fatia para a lista nao pular", () => {
    const { rerender } = render(
      <ListStatus loading={false} error={false} hasMore total={100} onLoadMore={noop} />,
    );

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    rerender(<ListStatus loading error={false} hasMore total={100} onLoadMore={noop} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  test("o botao continua acionavel por teclado durante o carregamento", async () => {
    let tentativas = 0;
    const user = userEvent.setup();

    render(
      <ListStatus
        loading
        error={false}
        hasMore
        total={100}
        onLoadMore={() => {
          tentativas += 1;
        }}
      />,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: /Carregar mais/ })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(tentativas).toBe(1);
  });
});
