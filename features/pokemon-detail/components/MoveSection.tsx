import { CHIP, SECTION_TITLE } from "@/features/pokemon-detail/constants";
import { MAX_MOVES } from "@/lib/api/mappers";
import { formatPokemonName } from "@/lib/format";

interface MoveSectionProps {
  moves: string[];
}

export function MoveSection({ moves }: MoveSectionProps) {
  return (
    <section aria-labelledby="movimentos" className="flex flex-col gap-3">
      <h2 id="movimentos" className={SECTION_TITLE}>
        Movimentos
      </h2>
      {/*
        A PokeAPI nao expoe ranking de relevancia, entao o criterio e
        explicito na propria UI em vez de fingir uma metrica de "principal".
      */}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Os {MAX_MOVES} primeiros movimentos na ordem em que a PokeAPI os devolve.
      </p>
      <ul className="flex flex-wrap gap-2">
        {moves.map((move) => (
          <li key={move} className={CHIP}>
            {formatPokemonName(move)}
          </li>
        ))}
      </ul>
    </section>
  );
}
