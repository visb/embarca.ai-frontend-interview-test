import type { Metadata } from "next";

import type { PokemonDetail } from "@/lib/api/types";
import { formatPokedexNumber, formatPokemonName } from "@/lib/format";

/**
 * Metadata da pagina de detalhe a partir do modelo de dominio.
 *
 * Funcao pura, fora da rota: o `generateMetadata` fica com o que so ele pode
 * fazer (ler `params` e ser exportado com esse nome), e a montagem do titulo, da
 * descricao e das imagens vira unidade testavel sem subir o Next.
 *
 * Mora na raiz do slice, e nao em `lib/`, porque a rota consome — e rota so
 * enxerga a superficie publica do slice.
 */
export function buildDetailMetadata(pokemon: PokemonDetail | null): Metadata {
  // Nome inexistente nao pode derrubar a rota: metadata neutra e a pagina segue
  // para o `notFound()`.
  if (!pokemon) return { title: "Pokemon nao encontrado" };

  const displayName = formatPokemonName(pokemon.name);
  const title = `${displayName} ${formatPokedexNumber(pokemon.id)}`;
  const description = `${displayName} e um pokemon do tipo ${pokemon.types.join(" e ")}. Veja habilidades e movimentos.`;
  const images = pokemon.spriteUrl ? [{ url: pokemon.spriteUrl, alt: displayName }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/pokemon/${pokemon.name}` },
    openGraph: { title, description, type: "article", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
