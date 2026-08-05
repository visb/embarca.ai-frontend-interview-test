import Link from "next/link";
import { Suspense } from "react";

import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { PokemonGridSkeleton } from "@/components/pokemon/PokemonGridSkeleton";
import { SearchInput } from "@/components/search/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { CATALOG_SIZE, getPokemonCatalog } from "@/lib/api/pokemon";
import { paginate } from "@/lib/pagination";
import { parsePageParam, parseQueryParam } from "@/lib/search-params";
import { filterByName } from "@/lib/search";

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
        Tanto o input (useSearchParams) quanto a grade (searchParams) dependem
        da requisicao. Cada um atras do seu Suspense: o cabecalho continua no
        shell prerenderizado e os dois streamam em paralelo.
      */}
      <div className="mb-6">
        <Suspense fallback={<Skeleton className="h-16 w-full sm:max-w-xs" />}>
          <SearchInput />
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
  const q = parseQueryParam(params.q);

  const catalog = await getPokemonCatalog();
  const filtered = filterByName(catalog, q);
  const result = paginate(filtered, parsePageParam(params.page));

  return (
    <>
      <PokemonGrid
        items={result.items}
        emptyTitle={`Nenhum pokemon encontrado para "${q}"`}
        emptyDescription="Tente outro termo ou volte para a lista completa."
        emptyAction={
          <Link
            href="/"
            className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100 dark:hover:bg-zinc-300"
          >
            Limpar busca
          </Link>
        }
      />
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        baseParams={q ? { q } : {}}
      />
    </>
  );
}
