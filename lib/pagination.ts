/** Paginacao em memoria. Pura, sem dependencia de Next nem de rede. */

export const PER_PAGE = 20;

export interface PaginationResult<T> {
  items: T[];
  /** Pagina efetivamente usada, ja com clamp aplicado. */
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}

/**
 * Fatia `items` na pagina pedida.
 *
 * A paginacao roda sobre o catalogo (e sobre o subconjunto filtrado), nao via
 * `offset` na PokeAPI: com busca ou filtro ativos o offset da API deixa de
 * bater com o conjunto exibido, e duas implementacoes divergiriam.
 *
 * Pagina fora do intervalo e clampada em vez de virar 404 — URL torta e mais
 * comum do que intencional, e uma tela quebrada seria pior.
 */
export function paginate<T>(items: T[], page: number, perPage: number = PER_PAGE): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), totalPages);
  const start = (safePage - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    totalPages,
    total,
    perPage,
  };
}
