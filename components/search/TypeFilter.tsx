"use client";

import { useSearchParams } from "next/navigation";

import { useFilterTransition } from "@/components/search/FilterTransition";
import { PendingIndicator } from "@/components/ui/PendingIndicator";
import type { PokemonType } from "@/lib/api/types";
import { buildQuery, listingHref } from "@/lib/url";

interface TypeFilterProps {
  types: PokemonType[];
}

export function TypeFilter({ types }: TypeFilterProps) {
  const { pending, navigate } = useFilterTransition();
  const searchParams = useSearchParams();
  const current = searchParams.get("type") ?? "";

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-3xs">
      <label
        htmlFor="pokemon-type"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Filtrar por tipo
      </label>
      {/*
        Indicador ao lado, nao sobreposto: o `<select>` nativo ja usa a direita
        para a seta do sistema.
      */}
      <div className="flex items-center gap-2">
        {/*
          `<select>` nativo de proposito: teclado, leitor de tela e o picker do
          sistema no mobile vem de graca. `buildQuery` cuida de zerar a pagina.
        */}
        <select
          id="pokemon-type"
          value={current}
          onChange={(event) => {
            // Mesma razao do SearchInput: dentro do handler a location e a fonte
            // confiavel da query atual.
            const query = buildQuery(window.location.search, { type: event.target.value });
            navigate(listingHref(query));
          }}
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
        >
          <option value="">Todos os tipos</option>
          {types.map((type) => (
            <option key={type.name} value={type.name} className="capitalize">
              {type.name}
            </option>
          ))}
        </select>
        <PendingIndicator pending={pending} />
      </div>
    </div>
  );
}
