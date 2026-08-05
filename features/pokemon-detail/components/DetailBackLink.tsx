import { BackLink } from "@/components/ui/BackLink";
import { backQuery } from "@/features/pokemon-detail/lib/back-query";

interface DetailBackLinkProps {
  /** `searchParams` da rota, ainda como promessa: e o que a mantem fora do shell. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Link de volta com os filtros que o card carregou na query. */
export async function DetailBackLink({ searchParams }: DetailBackLinkProps) {
  const params = await searchParams;

  return <BackLink query={backQuery(params)} />;
}
