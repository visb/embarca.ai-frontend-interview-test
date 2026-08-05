import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingPokemonDetail() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="sr-only" role="status">
        Carregando pokemon
      </p>

      <Skeleton className="mb-8 h-5 w-48" />

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Skeleton className="aspect-square w-full max-w-xs shrink-0 rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}
