import { Skeleton } from "@/components/ui/Skeleton";
import { PER_PAGE } from "@/lib/pagination";

interface PokemonGridSkeletonProps {
  count?: number;
}

/**
 * Placeholders com a mesma estrutura do card, para o conteudo real nao empurrar
 * o layout quando chegar. Usado pelo `loading.tsx` e pelo `<Suspense>` da home.
 */
export function PokemonGridSkeleton({ count = PER_PAGE }: PokemonGridSkeletonProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="flex h-full flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}
