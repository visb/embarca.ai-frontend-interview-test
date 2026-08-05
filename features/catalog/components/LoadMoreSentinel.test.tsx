import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LoadMoreSentinel } from "@/features/catalog/components/LoadMoreSentinel";

/**
 * `IntersectionObserver` nao existe no jsdom.
 *
 * O duble separa duas coisas que o observer de verdade separa e que sao o
 * assunto desta suite: **onde a ancora esta** e **quando o observer conta
 * isso**. Um observer real reentrega o estado atual ao (re)observar o elemento
 * — e disso que depende o rearme do sentinel.
 */
class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];

  private isIntersecting = false;
  private observing = false;

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe() {
    this.observing = true;
    // Como o de verdade: observar ja entrega a leitura atual.
    this.deliver();
  }

  unobserve() {
    this.observing = false;
  }

  disconnect() {
    this.observing = false;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** A base da lista cruza (ou sai da) viewport, e o observer avisa. */
  intersect(isIntersecting: boolean) {
    this.isIntersecting = isIntersecting;
    act(() => this.deliver());
  }

  /**
   * Move a ancora **sem** avisar: e o estado em que a fatia recem-anexada
   * empurrou a base para fora da tela mas o observer ainda nao reprocessou.
   * Era exatamente esse intervalo que o sentinel antigo lia errado.
   */
  moveTo(isIntersecting: boolean) {
    this.isIntersecting = isIntersecting;
  }

  private deliver() {
    if (!this.observing) return;
    this.callback([{ isIntersecting: this.isIntersecting } as IntersectionObserverEntry], this);
  }
}

/** Ultima instancia criada — e a que observa a ancora recem-renderizada. */
function viewport(): FakeIntersectionObserver {
  const instance = FakeIntersectionObserver.instances.at(-1);
  if (!instance) throw new Error("Nenhum IntersectionObserver foi criado.");
  return instance;
}

/** Frames agendados pelo rearme, sob controle do teste. */
let frames: Array<(() => void) | null>;

/** Roda o frame do rearme, como o browser faria na pintura seguinte. */
function flushFrames() {
  const pending = frames;
  frames = [];
  act(() => {
    for (const frame of pending) frame?.();
  });
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  frames = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
    frames[handle - 1] = null;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Conta pedidos de carregamento, que e a unidade que interessa aqui. */
function setup(enabled: boolean) {
  const counter = { loads: 0 };
  const onVisible = () => {
    counter.loads += 1;
  };

  const view = render(
    <LoadMoreSentinel enabled={enabled} onVisible={onVisible}>
      <button type="button">Carregar mais</button>
    </LoadMoreSentinel>,
  );

  const setEnabled = (next: boolean) =>
    view.rerender(
      <LoadMoreSentinel enabled={next} onVisible={onVisible}>
        <button type="button">Carregar mais</button>
      </LoadMoreSentinel>,
    );

  return { counter, setEnabled, unmount: view.unmount };
}

/** Ciclo de uma fatia: sai do ar para carregar e volta quando ela chega. */
function loadSlice(setEnabled: (next: boolean) => void) {
  setEnabled(false);
  setEnabled(true);
}

describe("LoadMoreSentinel", () => {
  test("chegar ao fim da lista carrega a proxima fatia", () => {
    const { counter } = setup(true);

    viewport().intersect(true);

    expect(counter.loads).toBe(1);
  });

  test("continuar visivel nao dispara um carregamento por evento", () => {
    const { counter } = setup(true);

    viewport().intersect(true);
    viewport().intersect(true);

    expect(counter.loads).toBe(1);
  });

  test("desligado, chegar ao fim da lista nao carrega nada", () => {
    const { counter } = setup(false);

    viewport().intersect(true);

    expect(counter.loads).toBe(0);
  });

  test("a fatia que chega e empurra a base para fora nao dispara a seguinte", () => {
    const { counter, setEnabled } = setup(true);

    viewport().intersect(true);
    expect(counter.loads).toBe(1);

    // A fatia entrou no DOM e a base saiu da tela — o observer ainda nao
    // reprocessou. Era aqui que o valor guardado disparava a fatia seguinte
    // sozinho, carregando 60 itens onde 40 bastavam.
    viewport().moveTo(false);
    loadSlice(setEnabled);
    flushFrames();

    expect(counter.loads).toBe(1);
  });

  test("com a base ainda visivel depois da fatia, a lista continua encadeando", () => {
    const { counter, setEnabled } = setup(true);

    viewport().intersect(true);

    // Viewport mais alta que a fatia: a base continua na tela depois de anexar,
    // e parar aqui deixaria o usuario com um botao para clicar.
    loadSlice(setEnabled);
    flushFrames();

    expect(counter.loads).toBe(2);
  });

  test("religar com a base ainda visivel retoma o carregamento", () => {
    const { counter, setEnabled } = setup(false);

    viewport().intersect(true);
    expect(counter.loads).toBe(0);

    setEnabled(true);
    flushFrames();

    expect(counter.loads).toBe(1);
  });

  test("sair e voltar a viewport dispara de novo, como na rolagem normal", () => {
    const { counter, setEnabled } = setup(true);

    viewport().intersect(true);
    viewport().moveTo(false);
    loadSlice(setEnabled);
    flushFrames();
    expect(counter.loads).toBe(1);

    viewport().intersect(true);

    expect(counter.loads).toBe(2);
  });

  test("oscilar o enabled sem interseccao nova nao carrega nada", () => {
    const { counter, setEnabled } = setup(true);

    // A base nunca chegou perto da tela: nenhum ciclo de loading pode inventar
    // um carregamento.
    loadSlice(setEnabled);
    flushFrames();

    expect(counter.loads).toBe(0);
  });

  test("desmontar durante o rearme nao dispara nada nem deixa frame agendado", () => {
    const { counter, setEnabled, unmount } = setup(true);

    viewport().intersect(true);
    loadSlice(setEnabled);

    unmount();
    flushFrames();

    // O remount por troca de filtro passa por aqui: um frame sobrevivente
    // carregaria uma fatia do conjunto anterior.
    expect(counter.loads).toBe(1);
  });

  test("quem navega por teclado alcanca o botao com Tab e dispara com Enter", async () => {
    // Caminho que a rolagem nunca cobre: sem evento de scroll, o gatilho
    // acessivel precisa existir de verdade.
    let carregamentos = 0;
    const user = userEvent.setup();

    render(
      <LoadMoreSentinel enabled={false} onVisible={() => {}}>
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
