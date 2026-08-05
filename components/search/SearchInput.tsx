"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useFilterTransition } from "@/components/shared/FilterTransition";
import { buildQuery, listingHref } from "@/lib/url";

/** Espera antes de navegar. Curto o bastante para parecer instantaneo. */
const DEBOUNCE_MS = 300;

export function SearchInput() {
  // Sem indicador proprio: o spinner do `TypeFilter` e unico para a barra
  // inteira, ja que busca e filtro compartilham o mesmo pending.
  const { signalPending, navigate, clearToken } = useFilterTransition();
  const searchParams = useSearchParams();
  const urlTerm = searchParams.get("q") ?? "";

  // Estado local so para o input responder a digitacao sem esperar a rota.
  // A URL continua sendo o source of truth do resultado.
  const [term, setTerm] = useState(urlTerm);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // "Limpar filtros" zera o campo na hora, sem esperar a URL. Ajuste durante o
  // render, pela mesma razao do `TypeFilter`: em `useEffect` o usuario veria um
  // frame com o termo antigo.
  const [syncedClearToken, setSyncedClearToken] = useState(clearToken);
  if (syncedClearToken !== clearToken) {
    setSyncedClearToken(clearToken);
    setTerm("");
  }

  // Debounce em voo desfaria a limpeza: ele navegaria de volta com o termo
  // antigo ~300ms depois do clique. Cancelar no efeito basta — o timer so
  // dispara muito depois de os efeitos deste render terem rodado.
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isTypingRef.current = false;
  }, [clearToken]);

  // URL colada, voltar do navegador ou o shell prerenderizado resolvendo os
  // params: o input acompanha — mas nunca por cima de digitacao pendente.
  useEffect(() => {
    if (!isTypingRef.current) setTerm(urlTerm);
  }, [urlTerm]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setTerm(value);
    isTypingRef.current = true;
    // Feedback ja na primeira tecla: o debounce abaixo so navega 300ms depois.
    signalPending();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      // Le a query direto da location: dentro do handler ela e sempre a atual,
      // enquanto `searchParams` pode estar defasada no shell prerenderizado.
      const query = buildQuery(window.location.search, { q: value });
      // `replace`, nao `push`: senao o historico ganha uma entrada por letra.
      navigate(listingHref(query));
    }, DEBOUNCE_MS);
  }

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
          onChange={(event) => handleChange(event.target.value)}
          placeholder="pikachu"
          autoComplete="off"
          // Nunca `disabled` durante o pending: bloquear a digitacao no meio da
          // transicao tiraria o foco e e pior que exibir resultado defasado.
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 pr-10 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
        />
        {term ? (
          <button
            type="button"
            onClick={() => handleChange("")}
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
