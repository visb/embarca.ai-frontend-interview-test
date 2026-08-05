interface PendingIndicatorProps {
  pending: boolean;
  className?: string;
}

/**
 * Spinner de feedback local. Decorativo — quem anuncia a mudanca para leitor de
 * tela e o `aria-busy` da area de resultados e o contador `aria-live`.
 *
 * Renderizado sempre, com tamanho fixo: alternar montagem empurraria o layout.
 * A visibilidade e animada com atraso (ver `.pending-indicator` no globals.css),
 * entao navegacao instantanea nao vira flash de spinner.
 */
export function PendingIndicator({ pending, className = "" }: PendingIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      data-pending={pending ? "" : undefined}
      className={`pending-indicator inline-flex size-4 shrink-0 ${className}`}
    >
      <span className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 motion-reduce:animate-none dark:border-zinc-700 dark:border-t-zinc-100" />
    </span>
  );
}
