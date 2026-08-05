import { act, render, screen } from "@testing-library/react";
import Link from "next/link";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { VirtualGrid } from "@/components/pokemon/VirtualGrid";
import { makeCatalog } from "@/test/fixtures/pokemon";

/**
 * O jsdom nao tem layout: `getBoundingClientRect` devolve 0 em tudo, entao toda
 * linha e medida com altura zero e o range do virtualizer nao diz nada aqui.
 * Que o DOM fica mesmo parcial e o que `e2e/virtual-list.spec.ts` prova, com um
 * browser de verdade. O que estes testes cobrem e o contrato do componente: o
 * handoff com o SSR, a semantica de lista e o repasse de props.
 */

/** A largura da viewport e o que decide as colunas (breakpoints do Tailwind). */
function setViewportWidth(width: number) {
  Object.defineProperty(document.documentElement, "clientWidth", {
    value: width,
    configurable: true,
  });
}

/** Cards montados. Os `<li>` dos badges de tipo moram dentro deles e nao tem posicao. */
const cards = () =>
  screen.getAllByRole("listitem").filter((el) => el.hasAttribute("aria-posinset"));

/** Container da grade: a lista mais externa — as de dentro sao os tipos de cada card. */
const list = () => screen.queryAllByRole("list")[0] ?? null;

beforeEach(() => {
  setViewportWidth(1280);
});

afterEach(() => {
  setViewportWidth(0);
});

describe("VirtualGrid", () => {
  test("hidratar em cima do markup do servidor nao acusa mismatch", () => {
    /*
      O caso que trava a story: o servidor manda os cards como HTML normal
      (`PokemonGrid`) e o primeiro render do cliente precisa ser exatamente esse
      markup. Se o `VirtualGrid` ja estreasse virtualizado, a hidratacao acharia
      uma arvore diferente da que veio pronta.
    */
    const items = makeCatalog(8);
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = renderToString(<PokemonGrid items={items} />);

    const recoverable: unknown[] = [];
    act(() => {
      hydrateRoot(container, <VirtualGrid items={items} />, {
        onRecoverableError: (error) => recoverable.push(error),
      });
    });

    expect(recoverable).toEqual([]);
    container.remove();
  });

  test("lista vazia cai no estado vazio, sem container virtual", () => {
    render(<VirtualGrid items={[]} emptyTitle="Nada por aqui" />);

    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
    expect(screen.queryAllByRole("list")).toHaveLength(0);
  });

  test("o estado vazio recebe descricao e saida como antes", () => {
    render(
      <VirtualGrid
        items={[]}
        emptyDescription='Nada combina com "zzz".'
        emptyAction={<Link href="/">Limpar filtros</Link>}
      />,
    );

    expect(screen.getByText('Nada combina com "zzz".')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpar filtros" })).toBeInTheDocument();
  });

  test("depois de montar, a grade e uma lista acessivel de cards", () => {
    render(<VirtualGrid items={makeCatalog(8)} />);

    expect(list()).toBeInTheDocument();
    // `role="listitem"` no lugar do `<li>`: as linhas ficam posicionadas em
    // absoluto e uma lista de linhas contaria 2 itens onde ha 8.
    expect(cards().length).toBeGreaterThan(0);
  });

  test("cada card anuncia a posicao na lista inteira, e nao no que esta montado", () => {
    // O `aria-setsize` e a lista de 100, mesmo quando so uma faixa de linhas
    // esta no DOM: sem ele o leitor de tela anunciaria o tamanho da janela.
    render(<VirtualGrid items={makeCatalog(100)} />);

    cards().forEach((card, index) => {
      expect(card).toHaveAttribute("aria-setsize", "100");
      expect(card).toHaveAttribute("aria-posinset", String(index + 1));
    });
  });

  test("as colunas vem do JS, e nao das classes do Tailwind", () => {
    render(<VirtualGrid items={makeCatalog(8)} />);

    // 1280 e o breakpoint `xl`, onde o `PokemonGrid` usa `xl:grid-cols-4`.
    const row = cards()[0].parentElement;
    expect(row).toHaveStyle({ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" });
  });

  test("largura de celular monta a grade em uma coluna", () => {
    setViewportWidth(375);

    render(<VirtualGrid items={makeCatalog(8)} />);

    const row = cards()[0].parentElement;
    expect(row).toHaveStyle({ gridTemplateColumns: "repeat(1, minmax(0, 1fr))" });
  });

  test("a query da listagem chega nos cards montados", () => {
    render(<VirtualGrid items={makeCatalog(8)} listingQuery="q=pika&page=2" />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("href", expect.stringContaining("?q=pika&page=2"));
    }
  });

  test("o container reserva altura propria em vez de seguir o que esta montado", () => {
    // E o que mantem a barra de rolagem honesta com o DOM parcial — sem isso a
    // pagina encolheria e o scroll infinito dispararia sozinho ate o fim.
    render(<VirtualGrid items={makeCatalog(100)} />);

    const container = list();
    expect(container).not.toBeNull();
    expect(Number.parseFloat(container?.style.height ?? "0")).toBeGreaterThan(0);
    // As linhas saem do fluxo: quem sustenta a altura e o container.
    expect(cards()[0].parentElement).toHaveStyle({ position: "absolute" });
  });
});
