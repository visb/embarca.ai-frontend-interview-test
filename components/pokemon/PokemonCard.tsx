import Image from "next/image";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import type { PokemonSummary } from "@/lib/api/types";
import { formatPokedexNumber, formatPokemonName } from "@/lib/format";

interface PokemonCardProps {
  pokemon: PokemonSummary;
}

export function PokemonCard({ pokemon }: PokemonCardProps) {
  const displayName = formatPokemonName(pokemon.name);

  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
        {pokemon.spriteUrl ? (
          <Image
            src={pokemon.spriteUrl}
            // O alt descreve a imagem sem repetir o nome que ja e texto no card.
            alt={`Ilustracao de ${displayName}`}
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
    </article>
  );
}
