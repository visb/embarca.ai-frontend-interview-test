"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { loadPokemonPage } from "@/app/actions";
import { ListStatus } from "@/components/pokemon/ListStatus";
import { LoadMoreSentinel } from "@/components/pokemon/LoadMoreSentinel";
import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { ResultCount } from "@/components/pokemon/ResultCount";
import type { PokemonSummary } from "@/lib/api/types";
import { buildQuery } from "@/lib/url";

interface InfiniteListProps {
  /** Fatias 1..N renderizadas no servidor a partir do `?page=N` da URL. */
  initialItems: PokemonSummary[];
  initialPage: number;
  initialHasMore: boolean;
  total: number;
  filters: { q: string; type?: string };
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

/**
 * Listagem com scroll infinito.
 *
 * Substitui os controles de paginacao, mas nao o estado de pagina: o `?page=N`
 * continua na URL como cursor de fatias carregadas. Ele e atualizado com
 * `history.replaceState`, e nao com `router.replace`, de proposito — o cursor e
 * estado do cliente, e uma navegacao do router faria o servidor re-renderizar a
 * lista acumulada inteira a cada rolagem, dobrando o trabalho de cada fatia.
 *
 * O reset ao trocar busca ou filtro vem do `key` na pagina: o remount limpa o
 * que ja foi anexado, para nao misturar itens de conjuntos diferentes.
 */
export function InfiniteList({
  initialItems,
  initialPage,
  initialHasMore,
  total,
  filters,
  emptyDescription,
  emptyAction,
}: InfiniteListProps) {
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

  // Query levada pelos cards, para o "voltar" do detalhe reabrir a listagem com
  // os mesmos filtros e o mesmo cursor. Acompanha o cursor atual.
  const listingQuery = useMemo(
    () =>
      buildQuery("", {
        q: filters.q || null,
        type: filters.type ?? null,
        page: page > 1 ? page : null,
      }),
    [filters.q, filters.type, page],
  );

  return (
    <div className="flex flex-col gap-4">
      <ResultCount total={total} shown={items.length} />

      <PokemonGrid
        items={items}
        listingQuery={listingQuery}
        emptyDescription={emptyDescription}
        emptyAction={emptyAction}
      />

      {/*
        `!loading` no `enabled` nao e so guarda: e o que faz o sentinel
        reavaliar quando a fatia termina de chegar e a base ainda esta visivel.
      */}
      <LoadMoreSentinel enabled={hasMore && !error && !loading} onVisible={loadMore}>
        <ListStatus
          loading={loading}
          error={error}
          hasMore={hasMore}
          total={total}
          onLoadMore={loadMore}
        />
      </LoadMoreSentinel>
    </div>
  );
}
