/**
 * Descricao do estado vazio: diz *o que* nao encontrou, e nao so "nada aqui".
 *
 * Sem isso o usuario com busca e filtro ativos nao sabe qual dos dois zerou a
 * lista.
 */
export function buildEmptyDescription(q: string, types: string[]): string {
  // Plural so quando ha mais de um tipo: "nos tipos fire" leria mal.
  const label = types.join(", ");
  const noun = types.length > 1 ? "nos tipos" : "no tipo";

  if (q && types.length) return `Nada combina com "${q}" ${noun} ${label}.`;
  if (q) return `Nada combina com "${q}".`;
  if (types.length) {
    return types.length > 1
      ? `Nenhum pokemon dos tipos ${label} nesta lista.`
      : `Nenhum pokemon do tipo ${label} nesta lista.`;
  }
  return "Tente outro termo ou volte para a lista completa.";
}
