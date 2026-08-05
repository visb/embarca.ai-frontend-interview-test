"use client";

import type { ReactNode } from "react";

import { PokemonGrid } from "@/features/catalog/components/PokemonGrid";
import { VirtualRow } from "@/features/catalog/components/VirtualRow";
import { useVirtualRows } from "@/features/catalog/hooks/useVirtualRows";
import type { PokemonSummary } from "@/lib/api/types";

interface VirtualGridProps {
  items: PokemonSummary[];
  /** Titulo do estado vazio — a busca e o filtro passam mensagens especificas. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Query atual da listagem, repassada aos cards para o link de volta. */
  listingQuery?: string;
}

/**
 * Grade da listagem que so monta as linhas visiveis.
 *
 * O ganho de performance aqui e teorico: com 100 itens e 4 colunas sao ~25
 * linhas no pior caso, e nenhuma metrica se move. O que a virtualizacao entrega
 * neste projeto e comportamento — o DOM para de crescer junto com a lista — e a
 * demonstracao da tecnica. Ver a entrada correspondente no `README.md`.
 *
 * A janela de linhas e assunto do `useVirtualRows`; aqui fica so a composicao.
 */
export function VirtualGrid({
  items,
  emptyTitle,
  emptyDescription,
  emptyAction,
  listingQuery,
}: VirtualGridProps) {
  const { hydrated, columns, attachContainer, virtualizer, scrollMargin } = useVirtualRows(
    items.length,
  );

  /*
    Lista vazia e pre-hidratacao caem no mesmo lugar: o markup do servidor. Sem
    itens nao ha o que virtualizar, e o `PokemonGrid` ja sabe montar o estado
    vazio com o titulo, a descricao e a saida que a listagem passou.
  */
  if (!hydrated || items.length === 0) {
    return (
      <PokemonGrid
        items={items}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={emptyAction}
        listingQuery={listingQuery}
      />
    );
  }

  return (
    /*
      `role="list"` em vez de `<ul>`: com as linhas posicionadas em absoluto, um
      `<li>` por linha anunciaria "25 itens" para uma lista de 100, e aninhar
      listas seria pior. Cada card volta a ser um `listitem`, e as linhas ficam
      como `presentation` para nao entrar no meio dessa relacao.
    */
    <div
      ref={attachContainer}
      role="list"
      style={{ position: "relative", height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((row) => (
        <VirtualRow
          key={row.key}
          row={row}
          items={items}
          columns={columns}
          scrollMargin={scrollMargin}
          measureElement={virtualizer.measureElement}
          listingQuery={listingQuery}
        />
      ))}
    </div>
  );
}
