import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LoadMoreSentinel } from "@/components/pokemon/LoadMoreSentinel";

/**
 * `IntersectionObserver` nao existe no jsdom. Este duble guarda as instancias
 * para o teste poder simular a base da lista entrando e saindo da viewport.
 */
class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Simula a base da lista cruzando (ou saindo de) a viewport. */
  intersect(isIntersecting: boolean) {
    act(() => {
      this.callback([{ isIntersecting } as IntersectionObserverEntry], this);
    });
  }
}

/** Ultima instancia criada — e a que observa a ancora recem-renderizada. */
function viewport(): FakeIntersectionObserver {
  const instance = FakeIntersectionObserver.instances.at(-1);
  if (!instance) throw new Error("Nenhum IntersectionObserver foi criado.");
  return instance;
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoadMoreSentinel", () => {
  test("chegar ao fim da lista carrega a proxima fatia", () => {
    let carregamentos = 0;

    render(
      <LoadMoreSentinel
        enabled
        onVisible={() => {
          carregamentos += 1;
        }}
      >
        <button type="button">Carregar mais</button>
      </LoadMoreSentinel>,
    );

    viewport().intersect(true);

    expect(carregamentos).toBe(1);
  });

  test("continuar visivel nao dispara um carregamento por evento", () => {
    let carregamentos = 0;

    render(
      <LoadMoreSentinel
        enabled
        onVisible={() => {
          carregamentos += 1;
        }}
      >
        <button type="button">Carregar mais</button>
      </LoadMoreSentinel>,
    );

    viewport().intersect(true);
    viewport().intersect(true);

    expect(carregamentos).toBe(1);
  });

  test("desligado, chegar ao fim da lista nao carrega nada", () => {
    let carregamentos = 0;

    render(
      <LoadMoreSentinel
        enabled={false}
        onVisible={() => {
          carregamentos += 1;
        }}
      >
        <button type="button">Carregar mais</button>
      </LoadMoreSentinel>,
    );

    viewport().intersect(true);

    expect(carregamentos).toBe(0);
  });

  test("religar com a base ainda visivel retoma o carregamento", () => {
    let carregamentos = 0;
    const onVisible = () => {
      carregamentos += 1;
    };

    const { rerender } = render(
      <LoadMoreSentinel enabled={false} onVisible={onVisible}>
        <button type="button">Carregar mais</button>
      </LoadMoreSentinel>,
    );

    viewport().intersect(true);
    rerender(
      <LoadMoreSentinel enabled onVisible={onVisible}>
        <button type="button">Carregar mais</button>
      </LoadMoreSentinel>,
    );

    expect(carregamentos).toBe(1);
  });

  test("quem navega por teclado alcanca o botao com Tab e dispara com Enter", async () => {
    // Caminho que a rolagem nunca cobre: sem evento de scroll, o gatilho
    // acessivel precisa existir de verdade.
    let carregamentos = 0;
    const user = userEvent.setup();

    render(
      <LoadMoreSentinel
        enabled={false}
        onVisible={() => {
          carregamentos += 1;
        }}
      >
        <button
          type="button"
          onClick={() => {
            carregamentos += 1;
          }}
        >
          Carregar mais
        </button>
      </LoadMoreSentinel>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Carregar mais" })).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(carregamentos).toBe(1);
  });
});
