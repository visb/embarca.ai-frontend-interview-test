import { AbilitySection } from "@/features/pokemon-detail/components/AbilitySection";
import { DetailHeader } from "@/features/pokemon-detail/components/DetailHeader";
import { MoveSection } from "@/features/pokemon-detail/components/MoveSection";
import type { PokemonDetail as PokemonDetailModel } from "@/lib/api/types";

interface PokemonDetailProps {
  pokemon: PokemonDetailModel;
}

/** Detalhe do pokemon: identificacao, habilidades e movimentos. */
export function PokemonDetail({ pokemon }: PokemonDetailProps) {
  return (
    <article className="flex flex-col gap-8">
      <DetailHeader pokemon={pokemon} />
      <AbilitySection abilities={pokemon.abilities} />
      <MoveSection moves={pokemon.moves} />
    </article>
  );
}
