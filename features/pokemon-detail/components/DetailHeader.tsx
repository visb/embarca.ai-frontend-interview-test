import { DetailSprite } from "@/features/pokemon-detail/components/DetailSprite";
import type { PokemonDetail } from "@/lib/api/types";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { formatPokedexNumber, formatPokemonName } from "@/lib/format";

interface DetailHeaderProps {
  pokemon: PokemonDetail;
}

/** Identificacao do pokemon: ilustracao, numero, nome, tipos e medidas. */
export function DetailHeader({ pokemon }: DetailHeaderProps) {
  const displayName = formatPokemonName(pokemon.name);

  return (
    // `div`, nao `header`: dentro de `<main>` ele viraria um `banner` aninhado.
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <DetailSprite spriteUrl={pokemon.spriteUrl} displayName={displayName} />

      <div className="flex flex-col gap-3">
        <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
          {formatPokedexNumber(pokemon.id)}
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {displayName}
        </h1>
        <ul className="flex flex-wrap gap-2">
          {pokemon.types.map((type) => (
            <li key={type}>
              <TypeBadge type={type} />
            </li>
          ))}
        </ul>
        <dl className="mt-2 flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">Altura</dt>
            {/* A PokeAPI usa decimetros e hectogramas. */}
            <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">Peso</dt>
            <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
