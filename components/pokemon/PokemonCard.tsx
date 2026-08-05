import Image from "next/image";
import Link from "next/link";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import type { PokemonSummary } from "@/lib/api/types";
import { formatPokedexNumber, formatPokemonName } from "@/lib/format";

interface PokemonCardProps {
  pokemon: PokemonSummary;
  /** Query da listagem atual, repassada para o detalhe saber para onde voltar. */
  listingQuery?: string;
  /**
   * Tamanho e posicao na lista logica. So a grade virtual passa os dois: com o
   * DOM parcial, sem eles o leitor de tela contaria as linhas montadas ("4 de
   * 12") em vez da lista de verdade. Ausentes, o card renderiza como sempre —
   * quem o envolve ali e um `<li>` de verdade.
   */
  setSize?: number;
  posInSet?: number;
}

export function PokemonCard({ pokemon, listingQuery = "", setSize, posInSet }: PokemonCardProps) {
  const displayName = formatPokemonName(pokemon.name);
  const href = listingQuery
    ? `/pokemon/${pokemon.name}?${listingQuery}`
    : `/pokemon/${pokemon.name}`;
  const inVirtualList = setSize !== undefined && posInSet !== undefined;

  return (
    <article
      className="h-full"
      role={inVirtualList ? "listitem" : undefined}
      aria-setsize={setSize}
      aria-posinset={posInSet}
    >
      {/*
        O card inteiro e clicavel, mas so o nome e o numero compoem o nome
        acessivel do link — a imagem fica com `alt` complementar para o leitor
        de tela nao anunciar a mesma informacao duas vezes.
      */}
      <Link
        href={href}
        // Nome explicito: lido em sequencia, o conteudo do card sairia como
        // "#0025 Pikachu electric" — numero cru e tipo solto no meio do nome.
        aria-label={`${displayName}, numero ${pokemon.id}`}
        className="flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:focus-visible:outline-zinc-100"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
          {pokemon.spriteUrl ? (
            <Image
              src={pokemon.spriteUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 20vw"
              className="object-contain p-2"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-zinc-500">
              Sem imagem
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {formatPokedexNumber(pokemon.id)}
          </span>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{displayName}</h2>
        </div>

        <ul className="mt-auto flex flex-wrap gap-1.5">
          {pokemon.types.map((type) => (
            <li key={type}>
              <TypeBadge type={type} />
            </li>
          ))}
        </ul>
      </Link>
    </article>
  );
}
