import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Params atuais (busca, filtro) que devem sobreviver a troca de pagina. */
  baseParams?: Record<string, string>;
}

function hrefForPage(page: number, baseParams: Record<string, string>): string {
  const params = new URLSearchParams(baseParams);
  // Pagina 1 nao aparece na URL: mantem `/` como a URL canonica da listagem.
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

const CONTROL_CLASSES =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700";

const LINK_CLASSES =
  "text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:focus-visible:outline-zinc-100 dark:hover:bg-zinc-800";

export function Pagination({ page, totalPages, baseParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Paginacao" className="mt-8 flex flex-col items-center gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {/* Extremos viram <span>: nao clicavel e fora da ordem de tabulacao. */}
          {page > 1 ? (
            <Link
              href={hrefForPage(page - 1, baseParams)}
              rel="prev"
              className={`${CONTROL_CLASSES} ${LINK_CLASSES}`}
            >
              Anterior
            </Link>
          ) : (
            <span className={`${CONTROL_CLASSES} text-zinc-400 dark:text-zinc-600`}>Anterior</span>
          )}
        </li>

        {pages.map((pageNumber) => (
          <li key={pageNumber}>
            {pageNumber === page ? (
              <span
                aria-current="page"
                className={`${CONTROL_CLASSES} border-zinc-900 bg-zinc-900 font-semibold text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900`}
              >
                {pageNumber}
              </span>
            ) : (
              <Link
                href={hrefForPage(pageNumber, baseParams)}
                aria-label={`Pagina ${pageNumber}`}
                className={`${CONTROL_CLASSES} ${LINK_CLASSES}`}
              >
                {pageNumber}
              </Link>
            )}
          </li>
        ))}

        <li>
          {page < totalPages ? (
            <Link
              href={hrefForPage(page + 1, baseParams)}
              rel="next"
              className={`${CONTROL_CLASSES} ${LINK_CLASSES}`}
            >
              Proxima
            </Link>
          ) : (
            <span className={`${CONTROL_CLASSES} text-zinc-400 dark:text-zinc-600`}>Proxima</span>
          )}
        </li>
      </ul>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pagina {page} de {totalPages}
      </p>
    </nav>
  );
}
