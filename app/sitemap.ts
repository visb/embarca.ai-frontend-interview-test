import type { MetadataRoute } from "next";

import { getPokemonCatalog } from "@/lib/api/pokemon";
import { SITE_URL } from "@/lib/site";

/** Listagem + as 100 rotas de detalhe, a partir do mesmo catalogo cacheado. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getPokemonCatalog();

  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...catalog.map((pokemon) => ({
      url: `${SITE_URL}/pokemon/${pokemon.name}`,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
  ];
}
