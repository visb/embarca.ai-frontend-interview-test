import type { Metadata } from "next";
import { Suspense } from "react";

import { InfiniteList } from "@/components/pokemon/InfiniteList";
import { PokemonGridSkeleton } from "@/components/pokemon/PokemonGridSkeleton";
import { ResultsArea } from "@/components/pokemon/ResultsArea";
import { ClearFiltersAction } from "@/components/search/ClearFiltersAction";
import { FilterBar } from "@/components/search/FilterBar";
import { FilterTransitionProvider } from "@/components/search/FilterTransition";
import { Skeleton } from "@/components/ui/Skeleton";
import { CATALOG_SIZE, getPokemonCatalog, getTypes } from "@/lib/api/pokemon";
import { applyFilters } from "@/lib/filters";
import { paginateCumulative } from "@/lib/pagination";
import { parsePageParam, parseQueryParam, parseTypeParam } from "@/lib/search-params";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Metadata estatica de proposito: a listagem filtrada (`?q=`/`?type=`) nao ganha
 * titulo proprio nem e indexada como pagina separada, senao o mesmo conteudo
 * apareceria duplicado no indice.
 */
export const metadata: Metadata = {
  // Titulo escrito por extenso: o `template` do layout raiz vale para os
  // segmentos filhos, nao para a pagina que vive no mesmo segmento que ele.
  title: `${SITE_NAME} — os ${CATALOG_SIZE} primeiros pokemons`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function Home(props: PageProps<"/">) {
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
            <PokemonResults searchParams={props.searchParams} />
          </Suspense>
        </ResultsArea>
      </FilterTransitionProvider>
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
  // Acumulado, nao a fatia: com scroll infinito o `?page=N` diz quantas fatias
  // ja foram carregadas — e o que devolve o usuario ao ponto certo ao voltar.
  const result = paginateCumulative(filtered, parsePageParam(params.page));

  return (
    // O `key` reseta o que o scroll anexou quando o conjunto muda: itens de
    // filtros diferentes nunca convivem na mesma lista.
    <InfiniteList
      key={`${q}|${type ?? ""}`}
      initialItems={result.items}
      initialPage={result.page}
      initialHasMore={result.hasMore}
      total={result.total}
      filters={{ q, type }}
      emptyDescription={buildEmptyDescription(q, type)}
      // Mesmo componente da barra de filtros: limpar daqui tambem zera os
      // controles na hora e liga o spinner, em vez de navegar em silencio.
      emptyAction={
        <ClearFiltersAction className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100" />
      }
    />
  );
}

function buildEmptyDescription(q: string, type?: string): string {
  if (q && type) return `Nada combina com "${q}" no tipo ${type}.`;
  if (q) return `Nada combina com "${q}".`;
  if (type) return `Nenhum pokemon do tipo ${type} nesta lista.`;
  return "Tente outro termo ou volte para a lista completa.";
}
