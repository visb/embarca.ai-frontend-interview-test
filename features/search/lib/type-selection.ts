/** Regras puras da selecao de tipos. Sem React, sem URL. */

import { MAX_LABEL_CHARS } from "@/features/search/constants";

/**
 * Rotulo do gatilho: o que esta filtrado, sem obrigar a abrir o dropdown.
 *
 * Mostra os nomes enquanto couberem. Quando nao cabem, os dois primeiros mais a
 * contagem do resto — "fire, water +2 tipos" diz mais que "4 tipos" e nao
 * estoura o controle. Ate dois tipos o nome sempre aparece: cortar ali daria
 * "+0 tipos".
 */
export function triggerLabel(selected: string[]): string {
  if (selected.length === 0) return "Todos os tipos";

  const full = selected.join(", ");
  if (selected.length <= 2 || full.length <= MAX_LABEL_CHARS) return full;

  const restantes = selected.length - 2;
  return `${selected.slice(0, 2).join(", ")} +${restantes} ${restantes === 1 ? "tipo" : "tipos"}`;
}

/**
 * Conjunto resultante de marcar ou desmarcar um tipo.
 *
 * Reconstroi na ordem do catalogo em vez de anexar: a selecao nunca guarda ordem
 * de clique, entao a mesma escolha sempre gera a mesma URL.
 */
export function toggleType(
  knownTypes: string[],
  selected: string[],
  type: string,
  checked: boolean,
): string[] {
  return knownTypes.filter((known) => (known === type ? checked : selected.includes(known)));
}
