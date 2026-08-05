/** Montagem das URLs da listagem. Compartilhado por busca, filtro e paginacao. */

/** Params que a listagem entende. `null`/`""` removem a chave. */
export interface ListingParams {
  q?: string | null;
  type?: string | null;
  page?: string | number | null;
}

/**
 * Aplica um patch sobre os params atuais e devolve a query string resultante.
 *
 * Tres regras ficam centralizadas aqui para nao divergirem entre os controles:
 * chave vazia some da URL (nada de `?q=`), pagina 1 nunca aparece (mantem `/`
 * canonica) e mexer em `q` ou `type` sempre zera `page` — senao o usuario
 * digita e cai numa pagina que o novo subconjunto nao tem.
 */
export function buildQuery(current: URLSearchParams | string, patch: ListingParams): string {
  const params = new URLSearchParams(current);

  if ("q" in patch || "type" in patch) {
    params.delete("page");
  }

  for (const [key, value] of Object.entries(patch)) {
    const normalized = value === null || value === undefined ? "" : String(value).trim();
    if (normalized === "") {
      params.delete(key);
    } else {
      params.set(key, normalized);
    }
  }

  if (params.get("page") === "1") {
    params.delete("page");
  }

  return params.toString();
}

/** Query string -> href da listagem, com `/` como URL canonica da pagina 1. */
export function listingHref(query: string): string {
  return query ? `/?${query}` : "/";
}
