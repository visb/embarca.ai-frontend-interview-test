/**
 * Cliente HTTP fino da PokeAPI.
 *
 * Unico ponto do projeto que fala `fetch`. Normaliza qualquer falha em
 * `PokeApiError` para que as camadas de cima nunca precisem inspecionar uma
 * `Response` crua nem diferenciar erro de rede de erro de parse.
 */

export const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

/** Erro de dominio da PokeAPI. `status` 0 significa falha antes da resposta. */
export class PokeApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PokeApiError";
    this.status = status;
    this.url = url;
  }

  /** Recurso inexistente — a pagina de detalhe usa isso para chamar `notFound()`. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/**
 * Busca `path` na PokeAPI e devolve o JSON tipado.
 *
 * `path` e relativo a base (ex.: `/pokemon/25`) ou uma URL absoluta da propria
 * API, ja que a PokeAPI devolve URLs completas dentro dos payloads.
 */
export async function pokeApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${POKEAPI_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new PokeApiError(`Falha de rede ao acessar ${url}`, 0, url, { cause });
  }

  if (!response.ok) {
    throw new PokeApiError(
      response.status === 404
        ? `Recurso nao encontrado: ${url}`
        : `PokeAPI respondeu ${response.status} para ${url}`,
      response.status,
      url,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new PokeApiError(`Resposta invalida (JSON) de ${url}`, response.status, url, {
      cause,
    });
  }
}
