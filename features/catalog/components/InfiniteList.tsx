"use client";

import type { ReactNode } from "react";

import { ListStatus } from "@/features/catalog/components/ListStatus";
import { LoadMoreSentinel } from "@/features/catalog/components/LoadMoreSentinel";
import { ResultCount } from "@/features/catalog/components/ResultCount";
import { VirtualGrid } from "@/features/catalog/components/VirtualGrid";
import { useInfiniteList } from "@/features/catalog/hooks/useInfiniteList";
import type { PokemonSummary } from "@/lib/api/types";

interface InfiniteListProps {
  /** Fatias 1..N renderizadas no servidor a partir do `?page=N` da URL. */
  initialItems: PokemonSummary[];
  initialPage: number;
  initialHasMore: boolean;
  total: number;
  filters: { q: string; types: string[] };
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

/**
 * Listagem com scroll infinito.
 *
 * Substitui os controles de paginacao, mas nao o estado de pagina: quem cuida do
 * acumulo, do cursor e do erro e o `useInfiniteList`.
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
  const { items, loading, error, hasMore, listingQuery, loadMore } = useInfiniteList({
    initialItems,
    initialPage,
    initialHasMore,
    filters,
  });

  return (
    <div className="flex flex-col gap-4">
      <ResultCount total={total} shown={items.length} />

      {/*
        Grade virtual: o scroll infinito continua anexando a fatia inteira ao
        estado, mas so as linhas visiveis ficam montadas.
      */}
      <VirtualGrid
        items={items}
        listingQuery={listingQuery}
        emptyDescription={emptyDescription}
        emptyAction={emptyAction}
      />

      {/*
        `!loading` no `enabled` nao e so guarda: a volta dele para `true` e o
        que faz o sentinel se rearmar e reavaliar a ancora depois que a fatia
        entrou no layout. Sem esse ciclo o observer ficaria em silencio com a
        base ainda visivel.
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
