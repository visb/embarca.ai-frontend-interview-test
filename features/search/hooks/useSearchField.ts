"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useFilterTransition } from "@/components/shared/FilterTransition";
import { DEBOUNCE_MS } from "@/features/search/constants";
import { buildQuery, listingHref } from "@/lib/url";

interface SearchField {
  /** Termo exibido no campo — responde a digitacao sem esperar a rota. */
  term: string;
  /** Digitou ou limpou: atualiza o campo e agenda a navegacao. */
  change: (value: string) => void;
}

/**
 * Campo de busca: espelho local, debounce e navegacao.
 *
 * A URL continua sendo o source of truth do resultado; o estado local existe so
 * para o input nao esperar o round-trip a cada tecla.
 */
export function useSearchField(): SearchField {
  // Sem indicador proprio: o spinner do `TypeFilter` e unico para a barra
  // inteira, ja que busca e filtro compartilham o mesmo pending.
  const { signalPending, navigate, clearToken } = useFilterTransition();
  const searchParams = useSearchParams();
  const urlTerm = searchParams.get("q") ?? "";

  const [term, setTerm] = useState(urlTerm);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // "Limpar filtros" zera o campo na hora, sem esperar a URL. Ajuste durante o
  // render, pela mesma razao do filtro de tipo: em `useEffect` o usuario veria um
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

  function change(value: string) {
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

  return { term, change };
}
