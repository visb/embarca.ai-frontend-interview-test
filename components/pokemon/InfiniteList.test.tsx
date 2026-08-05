import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { PokemonPage } from "@/app/actions";
import { InfiniteList } from "@/components/pokemon/InfiniteList";
import { makeCatalog } from "@/test/fixtures/pokemon";

const { loadPokemonPageMock } = vi.hoisted(() => ({ loadPokemonPageMock: vi.fn() }));

// Server Action: fronteira de I/O. O que se verifica adiante e sempre o DOM
// resultante ou a URL, nunca "a acao foi chamada".
vi.mock("@/app/actions", () => ({ loadPokemonPage: loadPokemonPageMock }));

/** O jsdom nao tem `IntersectionObserver`; aqui a rolagem nunca dispara sozinha. */
class SilentIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const catalog = makeCatalog(100);

/** Fatia `page` do catalogo, no formato que a Server Action devolve. */
function pageOf(page: number): PokemonPage {
  return {
    items: catalog.slice((page - 1) * 20, page * 20),
    page,
    hasMore: page < 5,
    total: catalog.length,
  };
}

function renderList() {
  return render(
    <InfiniteList
      initialItems={catalog.slice(0, 20)}
      initialPage={1}
      initialHasMore
      total={catalog.length}
      filters={{ q: "" }}
    />,
  );
}

const cards = () => screen.getAllByRole("link");
const loadMoreButton = () => screen.getByRole("button", { name: /Carregar mais/ });

beforeEach(() => {
  loadPokemonPageMock.mockReset();
  vi.stubGlobal("IntersectionObserver", SilentIntersectionObserver);
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InfiniteList", () => {
  test("comeca com a fatia renderizada no servidor", () => {
    renderList();

    expect(cards()).toHaveLength(20);
    expect(screen.getByText("Mostrando 20 de 100 pokemons")).toBeInTheDocument();
  });

  test("carregar mais anexa a fatia nova sem desmontar os cards ja na tela", async () => {
    loadPokemonPageMock.mockResolvedValue(pageOf(2));
    const user = userEvent.setup();
    renderList();

    const primeiroCard = screen.getByRole("link", { name: "Especie1, numero 1" });

    await user.click(loadMoreButton());

    await waitFor(() => expect(cards()).toHaveLength(40));
    // Mesmo no do DOM: a lista cresceu, nao foi remontada — o que preserva
    // posicao de rolagem e foco.
    expect(screen.getByRole("link", { name: "Especie1, numero 1" })).toBe(primeiroCard);
    expect(screen.getByRole("link", { name: "Especie40, numero 40" })).toBeInTheDocument();
  });

  test("dois pedidos concorrentes carregam a fatia uma vez so", async () => {
    let resolveLoad: (page: PokemonPage) => void = () => {};
    loadPokemonPageMock.mockImplementation(
      () =>
        new Promise<PokemonPage>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const user = userEvent.setup();
    renderList();

    await user.click(loadMoreButton());
    await user.click(loadMoreButton());

    resolveLoad(pageOf(2));

    await waitFor(() => expect(cards()).toHaveLength(40));
    // 60 cards significaria que a segunda chamada passou pela trava.
    expect(cards()).toHaveLength(40);
  });

  test("falhar ao carregar preserva os cards e oferece nova tentativa", async () => {
    loadPokemonPageMock.mockRejectedValue(new Error("rede caiu"));
    const user = userEvent.setup();
    renderList();

    await user.click(loadMoreButton());

    expect(await screen.findByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(cards()).toHaveLength(20);
  });

  test("a nova tentativa bem sucedida anexa a fatia que faltou", async () => {
    loadPokemonPageMock.mockRejectedValueOnce(new Error("rede caiu"));
    loadPokemonPageMock.mockResolvedValue(pageOf(2));
    const user = userEvent.setup();
    renderList();

    await user.click(loadMoreButton());
    await user.click(await screen.findByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(cards()).toHaveLength(40));
  });

  test("carregar a ultima fatia anuncia o fim da lista", async () => {
    loadPokemonPageMock.mockResolvedValue({ ...pageOf(2), hasMore: false });
    const user = userEvent.setup();
    renderList();

    await user.click(loadMoreButton());

    expect(await screen.findByText("100 de 100 pokemons")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Carregar mais/ })).not.toBeInTheDocument();
  });

  test("a URL acompanha as fatias carregadas sem empilhar historico", async () => {
    loadPokemonPageMock.mockResolvedValue(pageOf(2));
    const user = userEvent.setup();
    renderList();

    const entradasAntes = window.history.length;

    await user.click(loadMoreButton());

    await waitFor(() => expect(window.location.search).toBe("?page=2"));
    // `replaceState`, nao `push`: voltar do detalhe cai na mesma quantidade de
    // cards sem transformar cada rolagem numa entrada do historico.
    expect(window.history.length).toBe(entradasAntes);
  });

  test("os cards levam a busca e o cursor atuais para o link de volta", async () => {
    loadPokemonPageMock.mockResolvedValue(pageOf(2));
    const user = userEvent.setup();

    render(
      <InfiniteList
        initialItems={catalog.slice(0, 20)}
        initialPage={1}
        initialHasMore
        total={catalog.length}
        filters={{ q: "especie", type: "grass" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Especie1, numero 1" })).toHaveAttribute(
      "href",
      "/pokemon/especie1?q=especie&type=grass",
    );

    await user.click(loadMoreButton());

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Especie1, numero 1" })).toHaveAttribute(
        "href",
        "/pokemon/especie1?q=especie&type=grass&page=2",
      ),
    );
  });

  test("conjunto vazio mostra o estado vazio com a saida oferecida", () => {
    render(
      <InfiniteList
        initialItems={[]}
        initialPage={1}
        initialHasMore={false}
        total={0}
        filters={{ q: "digimon" }}
        emptyDescription='Nada combina com "digimon".'
        emptyAction={<Link href="/">Limpar filtros</Link>}
      />,
    );

    expect(screen.getByText('Nada combina com "digimon".')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpar filtros" })).toBeInTheDocument();
    expect(screen.getByText("0 pokemons encontrados")).toBeInTheDocument();
  });
});
