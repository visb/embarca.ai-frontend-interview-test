"use client";

import type { VirtualItem } from "@tanstack/react-virtual";

import { PokemonCard } from "@/features/catalog/components/PokemonCard";
import type { PokemonSummary } from "@/lib/api/types";

interface VirtualRowProps {
  row: VirtualItem;
  /** Lista logica inteira: a linha corta a sua fatia e anuncia a posicao real. */
  items: PokemonSummary[];
  columns: number;
  scrollMargin: number;
  measureElement: (node: Element | null) => void;
  listingQuery?: string;
}

/** Uma linha montada da grade virtual, posicionada em absoluto. */
export function VirtualRow({
  row,
  items,
  columns,
  scrollMargin,
  measureElement,
  listingQuery,
}: VirtualRowProps) {
  const first = row.index * columns;

  return (
    <div
      // Lido pelo `measureElement` para saber qual linha mediu.
      data-index={row.index}
      ref={measureElement}
      // `presentation` para a linha nao entrar entre a lista e os cards.
      role="presentation"
      className="grid gap-4"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${row.start - scrollMargin}px)`,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {items.slice(first, first + columns).map((pokemon, column) => (
        <PokemonCard
          key={pokemon.id}
          pokemon={pokemon}
          listingQuery={listingQuery}
          // Posicao na lista logica: com o DOM parcial, e o que faz o leitor de
          // tela anunciar "40 de 100" em vez de "4 de 12".
          setSize={items.length}
          posInSet={first + column + 1}
        />
      ))}
    </div>
  );
}
