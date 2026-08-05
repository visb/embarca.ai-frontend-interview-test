import { buildQuery } from "@/lib/url";

/** `searchParams` como o Next entrega: valor ausente, unico ou repetido. */
type RawParams = Record<string, string | string[] | undefined>;

/**
 * Query que o link de volta carrega.
 *
 * O card manda busca, tipo e cursor na URL do detalhe justamente para o retorno
 * cair na mesma listagem. Param repetido (`?q=a&q=b`) e descartado em vez de
 * concatenado: e URL malformada, e a listagem so entende um valor por chave.
 */
export function backQuery(params: RawParams): string {
  return buildQuery("", {
    q: typeof params.q === "string" ? params.q : null,
    type: typeof params.type === "string" ? params.type : null,
    page: typeof params.page === "string" ? params.page : null,
  });
}
