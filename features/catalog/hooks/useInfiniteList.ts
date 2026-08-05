"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { loadPokemonPage } from "@/features/catalog/actions";
import type { PokemonSummary } from "@/lib/api/types";
import { buildQuery } from "@/lib/url";

interface InfiniteListInput {
  /** Fatias 1..N renderizadas no servidor a partir do `?page=N` da URL. */
  initialItems: PokemonSummary[];
  initialPage: number;
  initialHasMore: boolean;
  filters: { q: string; types: string[] };
}

interface InfiniteList {
  items: PokemonSummary[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  /** Query que os cards carregam para o "voltar" do detalhe. Acompanha o cursor. */
  listingQuery: string;
  loadMore: () => void;
}

/**
 * Acumulo das fatias da listagem.
 *
 * O `?page=N` continua na URL como cursor, mas atualizado com
 * `history.replaceState`, e nao com `router.replace`, de proposito — o cursor e
 * estado do cliente, e uma navegacao do router faria o servidor re-renderizar a
 * lista acumulada inteira a cada rolagem, dobrando o trabalho de cada fatia.
 *
 * O reset ao trocar busca ou filtro vem do `key` na pagina: o remount limpa o
 * que ja foi anexado, para nao misturar itens de conjuntos diferentes.
 */
export function useInfiniteList({
  initialItems,
  initialPage,
  initialHasMore,
  filters,
}: InfiniteListInput): InfiniteList {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // O observer pode disparar de novo antes de o `setLoading` refletir no render;
  // a trava precisa ser sincrona.
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      const next = await loadPokemonPage(page + 1, filters);

      setItems((current) => [...current, ...next.items]);
      setPage(next.page);
      setHasMore(next.hasMore);

      // URL sincronizada sem re-render: e o que faz voltar do detalhe cair na
      // mesma quantidade de cards.
      const query = buildQuery(window.location.search, { page: next.page });
      window.history.replaceState(null, "", query ? `/?${query}` : "/");
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters, hasMore, page]);

  const listingQuery = useMemo(
    () =>
      buildQuery("", {
        q: filters.q || null,
        type: filters.types,
        page: page > 1 ? page : null,
      }),
    [filters.q, filters.types, page],
  );

  return { items, loading, error, hasMore, listingQuery, loadMore };
}
