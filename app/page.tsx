import type { Metadata } from "next";

import { CatalogPage } from "@/features/catalog/CatalogPage";
import { CATALOG_SIZE } from "@/lib/api/pokemon";
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
  return <CatalogPage searchParams={props.searchParams} />;
}
