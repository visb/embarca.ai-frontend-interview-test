"use client";

import { useSearchField } from "@/features/search/hooks/useSearchField";

export function SearchInput() {
  const { term, change } = useSearchField();

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
      <label
        htmlFor="pokemon-search"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Buscar por nome
      </label>
      <div className="relative">
        <input
          id="pokemon-search"
          // `text`, nao `search`: o X nativo do Chrome duplicaria o botao Limpar.
          type="text"
          value={term}
          onChange={(event) => change(event.target.value)}
          placeholder="pikachu"
          autoComplete="off"
          // Nunca `disabled` durante o pending: bloquear a digitacao no meio da
          // transicao tiraria o foco e e pior que exibir resultado defasado.
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 pr-10 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
        />
        {term ? (
          <button
            type="button"
            onClick={() => change("")}
            // Nome acessivel proprio: sem o contexto visual do campo, um
            // "Limpar" solto na lista de elementos nao se distingue do
            // "Limpar filtros" da barra.
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-zinc-600 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100"
          >
            {/*
              SVG inline em vez de lib de icones: um unico icone nao paga o
              custo de bundle. Decorativo — quem nomeia o botao e o `aria-label`,
              entao o desenho fica fora da arvore de acessibilidade.
            */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="size-4"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6 18 18" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
