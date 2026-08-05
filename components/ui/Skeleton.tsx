interface SkeletonProps {
  className?: string;
}

/** Bloco de shimmer reusavel. Sempre decorativo — nunca anunciado por leitor de tela. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}
