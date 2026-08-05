import Link from "next/link";

import { listingHref } from "@/lib/url";

interface BackLinkProps {
  /** Query da listagem de origem, carregada pelo link do card. */
  query?: string;
}

/**
 * Volta para a listagem preservando busca e filtro. Sem isso o usuario perde o
 * que tinha filtrado ao clicar em um card e voltar.
 */
export function BackLink({ query = "" }: BackLinkProps) {
  return (
    <Link
      href={listingHref(query)}
      className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 hover:text-zinc-950 dark:text-zinc-300 dark:focus-visible:outline-zinc-100 dark:hover:text-zinc-50"
    >
      <span aria-hidden="true">&larr;</span> Voltar para a listagem
    </Link>
  );
}
