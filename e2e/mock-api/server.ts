/**
 * Mock da PokeAPI para a suite e2e.
 *
 * `node:http` puro, sem dependencia nova: o contrato consumido pelo app sao
 * tres endpoints (`/pokemon?limit=`, `/pokemon/{id|nome}` e `/type`) mais o
 * sprite. Uma biblioteca de mock traria mais superficie do que o problema tem.
 *
 * Roda direto no Node (`node e2e/mock-api/server.ts`), que apaga os tipos
 * sozinho desde a 22.18 — por isso o import relativo carrega a extensao `.ts`.
 *
 * Env:
 * - `MOCK_PORT`  porta (padrao 3100).
 * - `MOCK_MODE`  `ok` (padrao) | `fail-catalog` | `fail-detail`.
 */

import { createServer } from "node:http";

import {
  buildDetailResponse,
  buildListResponse,
  buildTypeListResponse,
  FAILING_DETAIL_NAME,
  findPokemon,
  MOCK_CATALOG_SIZE,
  PIXEL_PNG_BASE64,
} from "./fixtures.ts";

const MODES = ["ok", "fail-catalog", "fail-detail"] as const;
type MockMode = (typeof MODES)[number];

function isMockMode(value: string): value is MockMode {
  return (MODES as readonly string[]).includes(value);
}

const port = Number(process.env.MOCK_PORT ?? 3100);
const requestedMode = process.env.MOCK_MODE ?? "ok";

if (!isMockMode(requestedMode)) {
  throw new Error(`MOCK_MODE invalido: ${requestedMode}. Use um de ${MODES.join(", ")}.`);
}

const mode: MockMode = requestedMode;

const pixel = Buffer.from(PIXEL_PNG_BASE64, "base64");

const server = createServer((request, response) => {
  // A base precisa ser a mesma que o app recebeu em `POKEAPI_BASE_URL`, senao
  // as URLs de sprite e de recurso apontariam para outro host.
  const baseUrl = `http://${request.headers.host ?? `localhost:${port}`}`;
  const url = new URL(request.url ?? "/", baseUrl);

  const sendJson = (status: number, payload: unknown) => {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
      // Sem cache HTTP: quem decide o que fica guardado e o `use cache` do app.
      "cache-control": "no-store",
    });
    response.end(body);
  };

  const sendError = (status: number, message: string) => sendJson(status, { error: message });

  if (url.pathname === "/type") {
    sendJson(200, buildTypeListResponse(baseUrl));
    return;
  }

  const spriteMatch = /^\/sprites\/(\d+)\.png$/.exec(url.pathname);
  if (spriteMatch) {
    response.writeHead(200, { "content-type": "image/png", "content-length": pixel.length });
    response.end(pixel);
    return;
  }

  if (url.pathname === "/pokemon" || url.pathname === "/pokemon/") {
    if (mode === "fail-catalog") {
      sendError(500, "catalogo indisponivel (MOCK_MODE=fail-catalog)");
      return;
    }

    const limit = Number(url.searchParams.get("limit") ?? MOCK_CATALOG_SIZE);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    sendJson(200, buildListResponse(baseUrl, limit, offset));
    return;
  }

  const detailMatch = /^\/pokemon\/([^/]+)\/?$/.exec(url.pathname);
  if (detailMatch) {
    const key = detailMatch[1];
    const pokemon = findPokemon(key);

    // Nome desconhecido e 404 em qualquer modo: e o caminho que leva a pagina
    // de "nao encontrado", e ele nao pode depender do modo de falha.
    if (!pokemon) {
      sendError(404, `nao encontrado: ${key}`);
      return;
    }

    // So o detalhe por *nome* falha: o catalogo pede por id e precisa continuar
    // funcionando, senao o erro provado seria o do catalogo, nao o do detalhe.
    if (mode === "fail-detail" && pokemon.name === FAILING_DETAIL_NAME && key === pokemon.name) {
      sendError(500, `detalhe indisponivel (MOCK_MODE=fail-detail): ${key}`);
      return;
    }

    sendJson(200, buildDetailResponse(baseUrl, pokemon));
    return;
  }

  sendError(404, `rota nao mapeada: ${url.pathname}`);
});

server.listen(port, () => {
  // O Playwright espera a porta abrir; a linha e para o log do `DEBUG=pw:webserver`.
  console.log(`mock da PokeAPI ouvindo em http://localhost:${port} (MOCK_MODE=${mode})`);
});
