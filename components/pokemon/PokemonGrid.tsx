import type { ReactNode } from "react";

import { PokemonCard } from "@/components/pokemon/PokemonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PokemonSummary } from "@/lib/api/types";

interface PokemonGridProps {
  items: PokemonSummary[];
  /** Titulo do estado vazio — a busca e o filtro passam mensagens especificas. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function PokemonGrid({
  items,
  emptyTitle = "Nenhum pokemon encontrado",
  emptyDescription,
  emptyAction,
}: PokemonGridProps) {
  if (items.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription}>
        {emptyAction}
      </EmptyState>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((pokemon) => (
        <li key={pokemon.id}>
          <PokemonCard pokemon={pokemon} />
        </li>
      ))}
    </ul>
  );
}
