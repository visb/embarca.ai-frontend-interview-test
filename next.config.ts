import type { NextConfig } from "next";

type ImagesConfig = NonNullable<NextConfig["images"]>;

/** URL do mock de fixtures da suite e2e, quando ele e quem esta no lugar da PokeAPI. */
function localMockUrl(): URL | undefined {
  const base = process.env.POKEAPI_BASE_URL?.trim();
  if (!base) return undefined;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return undefined;
  }

  return url.hostname === "localhost" || url.hostname === "127.0.0.1" ? url : undefined;
}

/**
 * Abre o `next/image` para os sprites do mock **somente** quando
 * `POKEAPI_BASE_URL` aponta para a maquina local.
 *
 * Sao duas travas do Next, e as duas precisam ceder: o host tem que entrar em
 * `remotePatterns` e o otimizador recusa endereco local por padrao (protecao
 * contra SSRF). Sem isso o teste provaria apenas que a imagem nao carrega — e a
 * imagem *carregando* e parte do que a listagem promete.
 *
 * Em producao a variavel nao existe, entao a lista continua fechada no host de
 * sprites da PokeAPI e o endereco local segue barrado.
 */
function mockImageAccess(): Partial<ImagesConfig> {
  const mock = localMockUrl();
  if (!mock) return {};

  return {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: mock.protocol === "https:" ? "https" : "http",
        hostname: mock.hostname,
        port: mock.port,
        pathname: "/sprites/**",
      },
    ],
  };
}

const mockImages = mockImageAccess();

const nextConfig: NextConfig = {
  // Nesta versao do Next o `fetch` nao e cacheado por default. Sem Cache
  // Components, montar o catalogo custaria 1 + 100 requisicoes por request.
  // Ver lib/api/pokemon.ts e stories/02-camada-de-servicos-pokeapi.md.
  cacheComponents: true,
  // A suite e2e sobe tres servidores Next do mesmo checkout (o build de producao
  // e dois `next dev` para o caminho de erro). Sem diretorios separados eles
  // disputariam o mesmo `.next`.
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  images: {
    ...mockImages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
      ...(mockImages.remotePatterns ?? []),
    ],
  },
};

export default nextConfig;
