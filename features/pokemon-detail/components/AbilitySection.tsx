import { CHIP, SECTION_TITLE } from "@/features/pokemon-detail/constants";
import type { PokemonAbility } from "@/lib/api/types";
import { formatPokemonName } from "@/lib/format";

interface AbilitySectionProps {
  abilities: PokemonAbility[];
}

export function AbilitySection({ abilities }: AbilitySectionProps) {
  return (
    // `<section>` vira landmark `region`; sem nome acessivel ele so polui a lista.
    <section aria-labelledby="habilidades" className="flex flex-col gap-3">
      <h2 id="habilidades" className={SECTION_TITLE}>
        Habilidades
      </h2>
      <ul className="flex flex-wrap gap-2">
        {abilities.map((ability) => (
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
  );
}
