import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { getPokemonCatalog } from "@/lib/api/pokemon";

export default async function Home() {
  const catalog = await getPokemonCatalog();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pokedex
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Os {catalog.length} primeiros pokemons da PokeAPI.
        </p>
      </header>

      <PokemonGrid items={catalog} />
    </main>
  );
}
