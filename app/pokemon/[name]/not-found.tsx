import Link from "next/link";

export default function PokemonNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Pokemon nao encontrado</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Nao existe nenhum pokemon com esse nome na PokeAPI.
      </p>
      <Link
        href="/"
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100 dark:hover:bg-zinc-300"
      >
        Voltar para a listagem
      </Link>
    </main>
  );
}
