"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { ClearFiltersAction } from "@/components/search/ClearFiltersAction";
import { useFilterTransition } from "@/components/search/FilterTransition";

/**
 * "Limpar filtros" da barra. So aparece quando ha filtro ativo — um botao de
 * limpar sempre visivel sugere um estado que nao existe.
 *
 * Some no instante do clique, sem esperar a URL commitar: o `useTransition`
 * segura a URL antiga durante toda a espera, e um "Limpar filtros" clicavel
 * sobre uma lista que ja esta sendo limpa e o mesmo tipo de mentira que o
 * `<select>` mostrando o tipo anterior.
 */
export function ClearFiltersLink() {
  const searchParams = useSearchParams();
  const { clearToken } = useFilterTransition();
  const hasFilters = Boolean(searchParams.get("q") || searchParams.get("type"));

  // Espelhos ajustados durante o render (nao em `useEffect`) para nao pintar um
  // frame com o estado velho — mesmo padrao do `TypeFilter`.
  const [visible, setVisible] = useState(hasFilters);
  const [syncedToken, setSyncedToken] = useState(clearToken);
  const [syncedHasFilters, setSyncedHasFilters] = useState(hasFilters);

  if (syncedToken !== clearToken) {
    setSyncedToken(clearToken);
    setVisible(false);
  }

  // A URL commitou: volta a mandar nela. Cobre voltar do navegador e URL colada.
  if (syncedHasFilters !== hasFilters) {
    setSyncedHasFilters(hasFilters);
    setVisible(hasFilters);
  }

  if (!visible) return null;

  return (
    <ClearFiltersAction className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100" />
  );
}
