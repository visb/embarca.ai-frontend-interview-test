import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { FilterTransitionProvider } from "@/components/shared/FilterTransition";
import { useTypeSelection } from "@/features/search/hooks/useTypeSelection";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    replace: (href: string) => window.history.replaceState(null, "", href),
  }),
}));

const KNOWN = ["grass", "fire", "water", "electric"];

/**
 * O comportamento do hook e exercitado pelo `TypeFilter` — marcar, desmarcar,
 * ordem canonica, reset otimista. O que sobra e o que nenhum clique alcanca: o
 * que a URL diz antes de existir interacao.
 */
function Harness({ knownTypes = KNOWN }: { knownTypes?: string[] }) {
  const { selected } = useTypeSelection(knownTypes);

  return <output>{selected.join("|")}</output>;
}

function setup(url: string, knownTypes?: string[]) {
  window.history.replaceState(null, "", url);
  render(
    <FilterTransitionProvider>
      <Harness knownTypes={knownTypes} />
    </FilterTransitionProvider>,
  );

  return screen.getByRole("status");
}

describe("useTypeSelection", () => {
  test("tipo que nao existe no catalogo e ignorado, e o valido continua valendo", () => {
    // `?type=stellar` chega de URL colada ou de link antigo: marcar uma caixa
    // que nenhum pokemon deste recorte tem daria filtro impossivel.
    expect(setup("/?type=stellar,fire")).toHaveTextContent("fire");
  });

  test("URL sem `type` comeca sem nada marcado", () => {
    expect(setup("/")).toBeEmptyDOMElement();
  });

  test("a selecao inicial ja sai na ordem do catalogo", () => {
    expect(setup("/?type=electric,grass")).toHaveTextContent("grass|electric");
  });

  test("catalogo vazio nao deixa nenhum tipo passar", () => {
    expect(setup("/?type=fire", [])).toBeEmptyDOMElement();
  });
});
