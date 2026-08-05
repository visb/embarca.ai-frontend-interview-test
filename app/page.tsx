import Link from "next/link";
import { Suspense } from "react";

import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { PokemonGridSkeleton } from "@/components/pokemon/PokemonGridSkeleton";
import { ResultCount } from "@/components/pokemon/ResultCount";
import { FilterBar } from "@/components/search/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { CATALOG_SIZE, getPokemonCatalog, getTypes } from "@/lib/api/pokemon";
import { applyFilters } from "@/lib/filters";
import { paginate } from "@/lib/pagination";
import { parsePageParam, parseQueryParam, parseTypeParam } from "@/lib/search-params";

export default function Home(props: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pokedex
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Os {CATALOG_SIZE} primeiros pokemons da PokeAPI.
        </p>
      </header>

      {/*
        Controles e resultado dependem da requisicao, entao cada bloco fica
        atras do seu Suspense: o cabecalho vai no shell prerenderizado e os
        dois streamam em paralelo, sem um esperar o outro.
      */}
      <div className="mb-6">
        <Suspense fallback={<Skeleton className="h-16 w-full sm:max-w-md" />}>
          <FilterBar />
        </Suspense>
      </div>

      <Suspense fallback={<PokemonGridSkeleton />}>
        <PokemonResults searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function PokemonResults({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;

  const [catalog, types] = await Promise.all([getPokemonCatalog(), getTypes()]);

  const q = parseQueryParam(params.q);
  const type = parseTypeParam(
    params.type,
    types.map((entry) => entry.name),
  );

  const filtered = applyFilters(catalog, { q, type });
  const result = paginate(filtered, parsePageParam(params.page));

  const baseParams: Record<string, string> = {};
  if (q) baseParams.q = q;
  if (type) baseParams.type = type;

  return (
    <div className="flex flex-col gap-4">
      <ResultCount total={result.total} />

      <PokemonGrid
        items={result.items}
        emptyTitle="Nenhum pokemon encontrado"
        emptyDescription={buildEmptyDescription(q, type)}
        emptyAction={
          <Link
            href="/"
            className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100 dark:hover:bg-zinc-300"
          >
            Limpar filtros
          </Link>
        }
      />

      <Pagination page={result.page} totalPages={result.totalPages} baseParams={baseParams} />
    </div>
  );
}

function buildEmptyDescription(q: string, type?: string): string {
  if (q && type) return `Nada combina com "${q}" no tipo ${type}.`;
  if (q) return `Nada combina com "${q}".`;
  if (type) return `Nenhum pokemon do tipo ${type} nesta lista.`;
  return "Tente outro termo ou volte para a lista completa.";
}
