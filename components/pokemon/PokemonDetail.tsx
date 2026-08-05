import Image from "next/image";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { MAX_MOVES } from "@/lib/api/mappers";
import type { PokemonDetail as PokemonDetailModel } from "@/lib/api/types";
import { formatPokedexNumber, formatPokemonName } from "@/lib/format";

interface PokemonDetailProps {
  pokemon: PokemonDetailModel;
}

const SECTION_TITLE = "text-lg font-semibold text-zinc-900 dark:text-zinc-100";
const CHIP =
  "inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-sm text-zinc-800 capitalize dark:bg-zinc-900 dark:text-zinc-200";

export function PokemonDetail({ pokemon }: PokemonDetailProps) {
  const displayName = formatPokemonName(pokemon.name);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
          {pokemon.spriteUrl ? (
            <Image
              src={pokemon.spriteUrl}
              alt={`Ilustracao de ${displayName}`}
              fill
              sizes="(max-width: 640px) 90vw, 320px"
              className="object-contain p-4"
              priority
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-zinc-500">
              Sem imagem
            </span>
          )}
        </div>

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
      </header>

      <section className="flex flex-col gap-3">
        <h2 className={SECTION_TITLE}>Habilidades</h2>
        <ul className="flex flex-wrap gap-2">
          {pokemon.abilities.map((ability) => (
            <li key={ability.name} className={CHIP}>
              {formatPokemonName(ability.name)}
              {ability.isHidden ? (
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-700 normal-case dark:bg-zinc-800 dark:text-zinc-300">
                  oculta
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={SECTION_TITLE}>Movimentos</h2>
        {/*
          A PokeAPI nao expoe ranking de relevancia, entao o criterio e
          explicito na propria UI em vez de fingir uma metrica de "principal".
        */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Os {MAX_MOVES} primeiros movimentos na ordem em que a PokeAPI os devolve.
        </p>
        <ul className="flex flex-wrap gap-2">
          {pokemon.moves.map((move) => (
            <li key={move} className={CHIP}>
              {formatPokemonName(move)}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
