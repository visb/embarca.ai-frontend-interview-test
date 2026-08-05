import { InfiniteList } from "@/features/catalog/components/InfiniteList";
import { getListing } from "@/features/catalog/data";
import { buildEmptyDescription } from "@/features/catalog/lib/empty-description";
import { ClearFiltersAction } from "@/components/shared/ClearFiltersAction";

interface CatalogResultsProps {
  /** `searchParams` da rota, ainda como promessa: e o que os mantem fora do shell. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Resultado da listagem para os filtros vigentes. */
export async function CatalogResults({ searchParams }: CatalogResultsProps) {
  const { items, page, hasMore, total, filters } = await getListing(await searchParams);

  return (
    // O `key` reseta o que o scroll anexou quando o conjunto muda: itens de
    // filtros diferentes nunca convivem na mesma lista.
    <InfiniteList
      key={`${filters.q}|${filters.types.join(",")}`}
      initialItems={items}
      initialPage={page}
      initialHasMore={hasMore}
      total={total}
      filters={filters}
      emptyDescription={buildEmptyDescription(filters.q, filters.types)}
      // Mesmo componente da barra de filtros: limpar daqui tambem zera os
      // controles na hora e liga o spinner, em vez de navegar em silencio.
      //
      // O `label` existe porque os dois links convivem na tela com o mesmo
      // texto e o mesmo destino: na lista de links do leitor de tela seriam
      // dois "Limpar filtros" seguidos, sem nada dizendo qual e qual. O nome
      // estendido comeca pelo texto visivel para nao quebrar comando de voz.
      emptyAction={
        <ClearFiltersAction
          label="Limpar filtros e ver a lista completa"
          className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100"
        />
      }
    />
  );
}
