/**
 * Normalizacao dos parametros de URL.
 *
 * A URL e o unico source of truth de pagina, busca e filtro, entao ela recebe
 * o que o usuario quiser digitar. Tudo que entra passa por aqui e sai como
 * valor seguro — nenhuma dessas funcoes lanca.
 */

/** Um valor de `searchParams`: ausente, unico ou repetido na query string. */
export type SearchParamValue = string | string[] | undefined;

/** Primeira ocorrencia de um param repetido (`?page=2&page=5` -> `"2"`). */
function firstValue(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `?page=` -> numero inteiro >= 1. Qualquer lixo vira 1; o clamp do limite
 * superior fica em `paginate`, que e quem conhece o total de paginas.
 */
export function parsePageParam(value: SearchParamValue): number {
  const raw = firstValue(value);
  if (!raw) return 1;

  // `Number` aceita "1e3" e " 2 "; `/^\d+$/` recusa antes de converter.
  if (!/^\d+$/.test(raw.trim())) return 1;

  const parsed = Number(raw.trim());
  return parsed >= 1 ? parsed : 1;
}
