import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ClearFiltersAction } from "@/components/search/ClearFiltersAction";
import { FilterTransitionProvider } from "@/components/shared/FilterTransition";
import { SearchInput } from "@/components/search/SearchInput";

const { navigations } = vi.hoisted(() => ({ navigations: [] as string[] }));

/**
 * Fronteira do framework. O `replace` alimenta a location do jsdom, entao o
 * teste verifica a **URL resultante** — que e o unico contrato do SearchInput.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    replace: (href: string) => {
      navigations.push(href);
      window.history.replaceState(null, "", href);
    },
  }),
}));

/** Espera do debounce do componente, com folga. */
const DEBOUNCE_MS = 400;

function setup(initialUrl = "/") {
  navigations.length = 0;
  window.history.replaceState(null, "", initialUrl);

  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  render(
    // O "Limpar filtros" entra junto porque o reset otimista do campo nasce
    // dele: sem o par, nao da para exercitar a limpeza pelo caminho real.
    <FilterTransitionProvider>
      <SearchInput />
      <ClearFiltersAction />
    </FilterTransitionProvider>,
  );

  return user;
}

const input = () => screen.getByLabelText("Buscar por nome");
const clearSearch = () => screen.getByRole("button", { name: "Limpar busca" });
const clearFilters = () => screen.getByRole("link", { name: "Limpar filtros" });

/** Deixa o debounce vencer e a navegacao commitar. */
async function settleDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
}

beforeEach(() => {
  // O `asyncWrapper` do Testing Library so drena a fila de timers quando existe
  // um global `jest`; sem este shim qualquer `user.*` com timers fake trava
  // esperando um `setTimeout(0)` que ninguem adianta.
  vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SearchInput", () => {
  test("o campo e alcancavel pelo rotulo visivel", () => {
    setup();

    expect(input()).toBeInTheDocument();
  });

  test("o valor inicial vem da URL", () => {
    setup("/?q=raichu");

    expect(input()).toHaveValue("raichu");
  });

  test("URL sem busca comeca com o campo vazio", () => {
    setup();

    expect(input()).toHaveValue("");
  });

  test("digitar um termo leva a URL para a listagem filtrada", async () => {
    const user = setup();

    await user.type(input(), "pika");
    await settleDebounce();

    expect(window.location.search).toBe("?q=pika");
  });

  test("digitar navega uma vez so, nao uma vez por tecla", async () => {
    const user = setup();

    await user.type(input(), "pika");
    await settleDebounce();

    expect(navigations).toEqual(["/?q=pika"]);
  });

  test("buscar a partir de uma pagina avancada volta para o inicio da lista", async () => {
    const user = setup("/?page=3");

    await user.type(input(), "pika");
    await settleDebounce();

    // Sem isso o usuario digitaria e cairia numa pagina que o novo
    // subconjunto nem tem.
    expect(window.location.search).toBe("?q=pika");
  });

  test("buscar preserva o filtro de tipo ja aplicado", async () => {
    const user = setup("/?type=electric");

    await user.type(input(), "pika");
    await settleDebounce();

    expect(new URLSearchParams(window.location.search).get("type")).toBe("electric");
    expect(new URLSearchParams(window.location.search).get("q")).toBe("pika");
  });

  test("limpar a busca tira o termo da URL em vez de deixar uma chave vazia", async () => {
    const user = setup("/?q=pika");

    await user.click(clearSearch());
    await settleDebounce();

    expect(input()).toHaveValue("");
    expect(window.location.search).toBe("");
    expect(navigations).toEqual(["/"]);
  });

  test("o botao de limpar so aparece quando ha o que limpar", async () => {
    const user = setup();

    expect(screen.queryByRole("button", { name: "Limpar busca" })).not.toBeInTheDocument();

    await user.type(input(), "p");

    expect(clearSearch()).toBeInTheDocument();
  });

  test("o botao so-icone continua exposto pelo nome acessivel", () => {
    setup("/?q=pika");

    // Trocar texto por icone nao pode custar acessibilidade: sem texto visivel,
    // o nome vem do `aria-label` e o desenho fica `aria-hidden`.
    expect(clearSearch()).toBeInTheDocument();
    expect(clearSearch()).toHaveTextContent("");
  });

  test("limpar a busca pelo icone preserva o filtro de tipo", async () => {
    const user = setup("/?q=pika&type=electric");

    await user.click(clearSearch());
    await settleDebounce();

    // O botao do campo limpa so o campo — quem zera tudo e o "Limpar filtros".
    expect(new URLSearchParams(window.location.search).get("q")).toBeNull();
    expect(new URLSearchParams(window.location.search).get("type")).toBe("electric");
  });

  test("limpar busca e limpar filtros sao dois controles distintos na mesma tela", () => {
    setup("/?q=pika");

    // Dois "Limpar" identicos na lista de elementos do leitor de tela nao
    // diriam qual zera o campo e qual zera tudo.
    expect(clearSearch()).not.toBe(clearFilters());
  });

  test("o campo nunca e bloqueado durante a busca e mantem o foco", async () => {
    const user = setup();

    await user.type(input(), "pika");

    // Ainda dentro da janela do debounce: e onde bloquear o campo custaria o
    // foco de quem esta digitando.
    expect(input()).toBeEnabled();
    expect(input()).toHaveFocus();

    await settleDebounce();

    expect(input()).toBeEnabled();
    expect(input()).toHaveFocus();
  });

  test("o texto digitado aparece imediatamente, sem esperar a navegacao", async () => {
    const user = setup();

    await user.type(input(), "pik");

    expect(input()).toHaveValue("pik");
    expect(navigations).toEqual([]);
  });

  test("limpar filtros zera o campo antes de a URL mudar", async () => {
    const user = setup("/?q=char");
    expect(input()).toHaveValue("char");

    await user.click(clearFilters());

    // A assercao vale *antes* de o servidor responder: o `useTransition` segura
    // a URL antiga, e esperar por ela deixaria o campo com o termo velho durante
    // toda a espera — que era a queixa.
    expect(input()).toHaveValue("");
  });

  test("limpar filtros durante o debounce nao deixa a busca voltar depois", async () => {
    const user = setup();

    await user.type(input(), "pika");
    await user.click(clearFilters());

    // Antes disso o timer em voo navegava para `/?q=pika` ~300ms depois do
    // clique, desfazendo a limpeza sem o usuario ter feito nada.
    await settleDebounce();

    expect(input()).toHaveValue("");
    expect(navigations).toEqual(["/"]);
    expect(window.location.search).toBe("");
  });
});
