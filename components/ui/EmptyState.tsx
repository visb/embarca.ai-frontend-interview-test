import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Slot de acao — a busca e o filtro injetam aqui o botao de limpar. */
  children?: ReactNode;
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
