import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholders com a mesma altura do card, para o conteudo nao empurrar o layout. */
const PLACEHOLDER_COUNT = 12;

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>

      <p className="sr-only" role="status">
        Carregando pokemons
      </p>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
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
    </main>
  );
}
