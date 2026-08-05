import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useGridColumns } from "@/features/catalog/hooks/useGridColumns";

/**
 * `ResizeObserver` controlado pelo teste: guarda os callbacks registrados para
 * o teste decidir *quando* o container muda de tamanho. O jsdom nao redimensiona
 * nada sozinho, entao esta e a unica forma de exercitar o caminho.
 */
const notifiers: Array<() => void> = [];

class TestResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe() {
    notifiers.push(() => this.callback([], this));
  }
  unobserve() {}
  disconnect() {}
}

/** A medida que decide as colunas e a largura da viewport, e nao a do container. */
function setViewportWidth(width: number) {
  Object.defineProperty(document.documentElement, "clientWidth", {
    value: width,
    configurable: true,
  });
}

function resizeTo(width: number) {
  setViewportWidth(width);
  act(() => {
    for (const notify of notifiers) notify();
  });
}

beforeEach(() => {
  notifiers.length = 0;
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  setViewportWidth(320);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGridColumns", () => {
  test("mede a largura ja no primeiro render, antes de o container existir", () => {
    // E o que permite o `VirtualGrid` estrear no modo virtual com o numero certo
    // de colunas: se a medicao esperasse o container, a grade piscaria em uma
    // coluna logo depois de hidratar.
    setViewportWidth(1280);

    const { result } = renderHook(() => useGridColumns());

    expect(result.current.columns).toBe(4);
  });

  test("mudar a largura para outro breakpoint recalcula as colunas", () => {
    const { result } = renderHook(() => useGridColumns());
    act(() => result.current.ref(document.createElement("div")));

    expect(result.current.columns).toBe(1);

    resizeTo(1024);

    expect(result.current.columns).toBe(3);
  });

  test("largura que muda sem cruzar breakpoint nao provoca render novo", () => {
    setViewportWidth(1280);

    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useGridColumns();
    });
    act(() => result.current.ref(document.createElement("div")));

    // O primeiro resize depois de um commit pode custar um render que o React
    // descarta sozinho; o que se mede aqui e o regime, do segundo em diante.
    resizeTo(1400);
    const antes = renders;

    resizeTo(1500);
    resizeTo(1600);

    // 1280, 1400, 1500 e 1600 dao as mesmas 4 colunas: remontar a grade a cada
    // pixel arrastado seria justamente o custo que a virtualizacao veio evitar.
    expect(result.current.columns).toBe(4);
    expect(renders).toBe(antes);
  });

  test("desmontar solta o observer", () => {
    const disconnect = vi.fn();
    class SpyResizeObserver extends TestResizeObserver {
      disconnect = disconnect;
    }
    vi.stubGlobal("ResizeObserver", SpyResizeObserver);

    const { result, unmount } = renderHook(() => useGridColumns());
    act(() => result.current.ref(document.createElement("div")));

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
