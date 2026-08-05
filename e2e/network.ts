import type { Page, Request } from "@playwright/test";

/**
 * Segura no ar as requisicoes que combinam com o predicado, ate o teste soltar.
 *
 * Substitui "atrasar N milissegundos": o estado pendente fica parado enquanto as
 * assercoes rodam, sem corrida com relogio, e o teste nao passa a depender de a
 * maquina ser rapida o bastante.
 *
 * Vale so para o que sai do browser — a server action (POST) e a navegacao do
 * router (`?_rsc=`). O I/O com a PokeAPI e server-side e nao passa por aqui; e
 * por isso que o caminho de erro dela precisa de um mock, e nao de `page.route`.
 */
export async function holdRequests(
  page: Page,
  matches: (request: Request) => boolean,
): Promise<() => void> {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route("**/*", async (route) => {
    if (matches(route.request())) await held;
    await route.continue();
  });

  return release;
}

/**
 * Deixa passar as `allowed` primeiras requisicoes que combinam e segura as
 * seguintes ate o fim do teste.
 *
 * E o que torna "rolou uma vez, anexou uma fatia" verificavel: a fatia que
 * chega pode deixar a base da lista visivel de novo e disparar a seguinte —
 * comportamento correto do app, mas que apagaria o passo sendo observado.
 */
export async function allowOnly(
  page: Page,
  matches: (request: Request) => boolean,
  allowed: number,
): Promise<void> {
  const forever = new Promise<void>(() => {});
  let seen = 0;

  await page.route("**/*", async (route) => {
    if (matches(route.request())) {
      seen += 1;
      if (seen > allowed) await forever;
    }
    await route.continue();
  });
}

/** A server action que entrega a proxima fatia — o unico POST que o app faz. */
export function isSliceRequest(request: Request): boolean {
  return request.method() === "POST";
}

/** Navegacao de busca ou filtro: o router busca a arvore nova com `?_rsc=`. */
export function isFilterNavigation(request: Request): boolean {
  return isSliceRequest(request) || new URL(request.url()).searchParams.has("_rsc");
}
