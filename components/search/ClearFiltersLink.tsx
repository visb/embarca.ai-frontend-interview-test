"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * So aparece quando ha filtro ativo — um botao de limpar sempre visivel sugere
 * um estado que nao existe.
 */
export function ClearFiltersLink() {
  const searchParams = useSearchParams();
  const hasFilters = Boolean(searchParams.get("q") || searchParams.get("type"));

  if (!hasFilters) return null;

  return (
    <Link
      href="/"
      className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100"
    >
      Limpar filtros
    </Link>
  );
}
