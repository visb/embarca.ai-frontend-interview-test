import { Suspense } from "react";

import { FilterTransitionProvider } from "@/components/shared/FilterTransition";
import { Skeleton } from "@/components/ui/Skeleton";
import { CatalogResults } from "@/features/catalog/components/CatalogResults";
import { PokemonGridSkeleton } from "@/features/catalog/components/PokemonGridSkeleton";
import { ResultsArea } from "@/features/catalog/components/ResultsArea";
import { FilterBar } from "@/features/search/FilterBar";
import { CATALOG_SIZE } from "@/lib/api/pokemon";

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Listagem: cabecalho, controles e resultado. */
export function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/*
        `div`, nao `header`: um `<header>` dentro de `<main>` vira landmark
        `banner` aninhado, o que confunde a navegacao por landmarks.
      */}
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pokedex
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Os {CATALOG_SIZE} primeiros pokemons da PokeAPI.
        </p>
      </div>

      {/*
        Controles e resultado dependem da requisicao, entao cada bloco fica
        atras do seu Suspense: o cabecalho vai no shell prerenderizado e os
        dois streamam em paralelo, sem um esperar o outro.
      */}
      {/*
        Provider acima dos dois blocos: o controle que disparou a navegacao
        mostra o spinner e o resultado se esmaece a partir do mesmo estado.
      */}
      <FilterTransitionProvider>
        <div className="mb-6">
          <Suspense fallback={<Skeleton className="h-16 w-full sm:max-w-md" />}>
            <FilterBar />
          </Suspense>
        </div>

        <ResultsArea>
          <Suspense fallback={<PokemonGridSkeleton />}>
            <CatalogResults searchParams={searchParams} />
          </Suspense>
        </ResultsArea>
      </FilterTransitionProvider>
    </main>
  );
}
