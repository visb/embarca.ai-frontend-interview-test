import { Suspense } from "react";

import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { PokemonGridSkeleton } from "@/components/pokemon/PokemonGridSkeleton";
import { Pagination } from "@/components/ui/Pagination";
import { CATALOG_SIZE, getPokemonCatalog } from "@/lib/api/pokemon";
import { paginate } from "@/lib/pagination";
import { parsePageParam } from "@/lib/search-params";

export default function Home(props: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pokedex
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Os {CATALOG_SIZE} primeiros pokemons da PokeAPI.
        </p>
      </header>

      {/*
        Ler `searchParams` depende da requisicao, entao a lista fica atras de um
        Suspense: o cabecalho vai no shell prerenderizado e so a grade espera.
      */}
      <Suspense fallback={<PokemonGridSkeleton />}>
        <PokemonResults searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function PokemonResults({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { page } = await searchParams;
  const catalog = await getPokemonCatalog();
  const result = paginate(catalog, parsePageParam(page));

  return (
    <>
      <PokemonGrid items={result.items} />
      <Pagination page={result.page} totalPages={result.totalPages} />
    </>
  );
}
