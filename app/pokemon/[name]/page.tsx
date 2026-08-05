import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PokemonDetail } from "@/components/pokemon/PokemonDetail";
import { BackLink } from "@/components/ui/BackLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { PokeApiError } from "@/lib/api/http";
import { getPokemonByName, getPokemonCatalog } from "@/lib/api/pokemon";
import { buildQuery } from "@/lib/url";

/**
 * Prerenderiza as 100 rotas do catalogo: dado imutavel, ganho de SEO e
 * navegacao instantanea. Nome fora da lista continua funcionando sob demanda.
 */
export async function generateStaticParams() {
  const catalog = await getPokemonCatalog();
  return catalog.map((pokemon) => ({ name: pokemon.name }));
}

export default async function PokemonPage(props: PageProps<"/pokemon/[name]">) {
  // `params` e lido aqui, e nao dentro do Suspense, para o `notFound()` chegar
  // a tempo de virar um 404 de verdade: depois que o shell e enviado, o status
  // ja foi. Como as 100 rotas validas sao prerenderizadas, o unico caso que
  // perde o shell instantaneo e justamente o nome inexistente.
  const { name } = await props.params;
  const pokemon = await fetchPokemonOr404(name);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* `searchParams` continua atras do boundary: so o link de volta depende dele. */}
      <div className="mb-8">
        <Suspense fallback={<Skeleton className="h-5 w-48" />}>
          <DetailBackLink searchParams={props.searchParams} />
        </Suspense>
      </div>

      <PokemonDetail pokemon={pokemon} />
    </main>
  );
}

async function DetailBackLink({
  searchParams,
}: Pick<PageProps<"/pokemon/[name]">, "searchParams">) {
  const params = await searchParams;

  // Reaproveita os filtros que o card carregou na query do link.
  const query = buildQuery("", {
    q: typeof params.q === "string" ? params.q : null,
    type: typeof params.type === "string" ? params.type : null,
    page: typeof params.page === "string" ? params.page : null,
  });

  return <BackLink query={query} />;
}

/**
 * O try/catch fica fora da renderizacao de proposito: JSX construido dentro de
 * um try nao tem os erros de render capturados por ele.
 */
async function fetchPokemonOr404(name: string) {
  try {
    return await getPokemonByName(name);
  } catch (error) {
    // 404 vira um 404 de verdade; qualquer outra falha sobe para o error.tsx.
    if (error instanceof PokeApiError && error.isNotFound) notFound();
    throw error;
  }
}
