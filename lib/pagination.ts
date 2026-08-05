/** Paginacao em memoria. Pura, sem dependencia de Next nem de rede. */

export const PER_PAGE = 20;

export interface PaginationResult<T> {
  items: T[];
  /** Pagina efetivamente usada, ja com clamp aplicado. */
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  /** Ha fatia seguinte — o scroll infinito para quando isso vira `false`. */
  hasMore: boolean;
}

/**
 * Pagina fora do intervalo e clampada em vez de virar 404 — URL torta e mais
 * comum do que intencional, e uma tela quebrada seria pior.
 */
function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(Math.trunc(page) || 1, 1), totalPages);
}

function totalPagesFor(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

/**
 * Fatia `items` na pagina pedida — apenas os itens daquela fatia.
 *
 * A paginacao roda sobre o catalogo (e sobre o subconjunto filtrado), nao via
 * `offset` na PokeAPI: com busca ou filtro ativos o offset da API deixa de
 * bater com o conjunto exibido, e duas implementacoes divergiriam.
 *
 * Usado pela Server Action que alimenta o scroll infinito: cada rolagem pede
 * so a fatia nova, nunca a lista inteira de novo.
 */
export function paginate<T>(
  items: T[],
  page: number,
  perPage: number = PER_PAGE,
): PaginationResult<T> {
  const total = items.length;
  const totalPages = totalPagesFor(total, perPage);
  const safePage = clampPage(page, totalPages);
  const start = (safePage - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    totalPages,
    total,
    perPage,
    hasMore: safePage < totalPages,
  };
}

/**
 * Fatias 1..N de uma vez.
 *
 * E o que a primeira renderizacao no servidor precisa: com scroll infinito o
 * `?page=N` da URL nao significa "mostre a fatia N", e sim "ja foram carregadas
 * N fatias". Sem isso, voltar do detalhe jogaria o usuario de volta ao topo.
 */
export function paginateCumulative<T>(
  items: T[],
  page: number,
  perPage: number = PER_PAGE,
): PaginationResult<T> {
  const total = items.length;
  const totalPages = totalPagesFor(total, perPage);
  const safePage = clampPage(page, totalPages);

  return {
    items: items.slice(0, safePage * perPage),
    page: safePage,
    totalPages,
    total,
    perPage,
    hasMore: safePage < totalPages,
  };
}
