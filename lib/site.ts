/**
 * Origem publica do site. As URLs absolutas de Open Graph dependem dela: sem
 * `metadataBase`, o Next gera caminhos relativos e o compartilhamento quebra
 * silenciosamente (nao falha o build, so gera link sem imagem).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "Pokedex";

export const SITE_DESCRIPTION =
  "Listagem, busca por nome, filtro por tipo e detalhes dos 100 primeiros pokemons, com dados da PokeAPI.";
