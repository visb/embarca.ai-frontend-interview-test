"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buildQuery, listingHref } from "@/lib/url";

/** Espera antes de navegar. Curto o bastante para parecer instantaneo. */
const DEBOUNCE_MS = 300;

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTerm = searchParams.get("q") ?? "";

  // Estado local so para o input responder a digitacao sem esperar a rota.
  // A URL continua sendo o source of truth do resultado.
  const [term, setTerm] = useState(urlTerm);
  const lastPushed = useRef(urlTerm);

  // URL colada ou navegacao pelo historico: o input acompanha.
  useEffect(() => {
    if (urlTerm !== lastPushed.current) {
      lastPushed.current = urlTerm;
      setTerm(urlTerm);
    }
  }, [urlTerm]);

  useEffect(() => {
    if (term === lastPushed.current) return;

    const timeout = setTimeout(() => {
      lastPushed.current = term;
      // `replace`, nao `push`: senao o historico ganha uma entrada por letra.
      router.replace(listingHref(buildQuery(searchParams.toString(), { q: term })), {
        scroll: false,
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [term, router, searchParams]);

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
      <label htmlFor="pokemon-search" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Buscar por nome
      </label>
      <div className="relative">
        <input
          id="pokemon-search"
          // `text`, nao `search`: o X nativo do Chrome duplicaria o botao Limpar.
          type="text"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="pikachu"
          autoComplete="off"
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 pr-16 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setTerm("")}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 hover:text-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-100 dark:hover:text-zinc-100"
          >
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}
