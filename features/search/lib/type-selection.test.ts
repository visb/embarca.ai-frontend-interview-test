import { describe, expect, test } from "vitest";

import { MAX_LABEL_CHARS } from "@/features/search/constants";
import { toggleType, triggerLabel } from "@/features/search/lib/type-selection";

describe("triggerLabel", () => {
  test("sem tipo marcado, o gatilho diz que nada esta filtrado", () => {
    expect(triggerLabel([])).toBe("Todos os tipos");
  });

  test("um tipo aparece pelo nome", () => {
    expect(triggerLabel(["fire"])).toBe("fire");
  });

  test("dois tipos aparecem inteiros mesmo estourando o orcamento", () => {
    // Cortar em dois daria "+0 tipos", que nao informa nada.
    const label = triggerLabel(["fighting", "electricidade-longa"]);

    expect(label).toBe("fighting, electricidade-longa");
    expect(label.length).toBeGreaterThan(MAX_LABEL_CHARS);
  });

  test("tres tipos curtos ainda cabem inteiros", () => {
    expect(triggerLabel(["fire", "ice", "bug"])).toBe("fire, ice, bug");
  });

  test("quando nao cabem, mostra os dois primeiros e conta o resto", () => {
    expect(triggerLabel(["fighting", "electric", "psychic", "dragon"])).toBe(
      "fighting, electric +2 tipos",
    );
  });

  test("um unico tipo no resto vai para o singular", () => {
    expect(triggerLabel(["fighting", "electric", "psychic"])).toBe("fighting, electric +1 tipo");
  });
});

describe("toggleType", () => {
  const KNOWN = ["grass", "fire", "water", "electric"];

  test("marcar um tipo o inclui", () => {
    expect(toggleType(KNOWN, [], "fire", true)).toEqual(["fire"]);
  });

  test("desmarcar remove so o tipo pedido", () => {
    expect(toggleType(KNOWN, ["grass", "fire"], "fire", false)).toEqual(["grass"]);
  });

  test("o resultado sai na ordem do catalogo, nao na de clique", () => {
    const primeiro = toggleType(KNOWN, ["water"], "grass", true);

    expect(primeiro).toEqual(["grass", "water"]);
  });

  test("marcar duas vezes o mesmo tipo nao duplica", () => {
    expect(toggleType(KNOWN, ["fire"], "fire", true)).toEqual(["fire"]);
  });

  test("desmarcar tipo que nao estava marcado nao muda nada", () => {
    expect(toggleType(KNOWN, ["fire"], "water", false)).toEqual(["fire"]);
  });

  test("tipo fora do catalogo nao entra na selecao", () => {
    // A lista de conhecidos e a fonte da verdade: `?type=stellar` na URL nao
    // pode virar uma caixa marcada que nenhum pokemon deste recorte tem.
    expect(toggleType(KNOWN, [], "stellar", true)).toEqual([]);
  });
});
