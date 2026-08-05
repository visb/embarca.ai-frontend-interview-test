"use client"; // Error boundaries precisam ser Client Components.

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function PokemonErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center"
    >
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Nao foi possivel carregar este pokemon
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        A PokeAPI nao respondeu como esperado. Isso costuma ser temporario.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100"
      >
        Tentar novamente
      </button>
    </main>
  );
}
