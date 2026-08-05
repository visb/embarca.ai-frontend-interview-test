import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { DetailBackLink } from "@/features/pokemon-detail/components/DetailBackLink";
import { PokemonDetail } from "@/features/pokemon-detail/components/PokemonDetail";
import { getDetail, listDetailParams } from "@/features/pokemon-detail/data";
import { buildDetailMetadata } from "@/features/pokemon-detail/metadata";

/**
 * Prerenderiza as 100 rotas do catalogo: dado imutavel, ganho de SEO e
 * navegacao instantanea. Nome fora da lista continua funcionando sob demanda.
 */
export function generateStaticParams() {
  return listDetailParams();
}

/**
 * Metadata com dados reais do pokemon — e o que gera valor de SEO de verdade.
 * Reusa a mesma funcao cacheada da pagina, entao nao custa request extra.
 */
export async function generateMetadata(props: PageProps<"/pokemon/[name]">): Promise<Metadata> {
  const { name } = await props.params;

  return buildDetailMetadata(await getDetail(name));
}

export default async function PokemonPage(props: PageProps<"/pokemon/[name]">) {
  // `params` e lido aqui, e nao dentro do Suspense, para o `notFound()` rodar o
  // mais cedo possivel. Com `cacheComponents` o App Shell ainda e enviado antes,
  // entao um nome inexistente mostra a pagina not-found com status 200 — e
  // `dynamicParams` (que resolveria) e incompativel com Cache Components.
  // Como as 100 rotas validas sao prerenderizadas, o caso so ocorre em URL
  // digitada a mao.
  const { name } = await props.params;
  const pokemon = await getDetail(name);

  // `null` e so "esse nome nao existe". Falha de verdade continua sendo lancada
  // la dentro e sobe para o `error.tsx`.
  if (!pokemon) notFound();

  return (
    <main id="conteudo" className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
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
