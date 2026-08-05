import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nesta versao do Next o `fetch` nao e cacheado por default. Sem Cache
  // Components, montar o catalogo custaria 1 + 100 requisicoes por request.
  // Ver lib/api/pokemon.ts e stories/02-camada-de-servicos-pokeapi.md.
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
  },
};

export default nextConfig;
