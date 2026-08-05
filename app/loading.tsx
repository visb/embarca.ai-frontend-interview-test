import { PokemonGridSkeleton } from "@/components/pokemon/PokemonGridSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    // `div`, nao `main`: enquanto o conteudo real streama os dois convivem no
    // DOM, e dois landmarks `main` (com o mesmo id) e pior do que nenhum.
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>

      <p className="sr-only" role="status">
        Carregando pokemons
      </p>

      <PokemonGridSkeleton />
    </div>
  );
}
