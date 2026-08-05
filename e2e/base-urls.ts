/**
 * Enderecos dos servidores que a suite e2e sobe.
 *
 * Ficam num modulo proprio porque o `playwright.config.ts` (que os inicia) e os
 * specs do caminho de erro (que escolhem contra qual app rodar) precisam do
 * mesmo mapa — duplicar porta em dois arquivos e a forma classica de a suite
 * passar apontando para o servidor errado.
 *
 * Tudo deriva de `PORT`, entao rodar com a 3000 ocupada e so trocar a variavel.
 */

const appPort = Number(process.env.PORT ?? 3000);

function localhost(port: number): string {
  return `http://localhost:${port}`;
}

export const PORTS = {
  /** App do caminho feliz: build de producao contra o mock em `MOCK_MODE=ok`. */
  app: appPort,
  /** App do caminho de erro do catalogo (`next dev`, mock em `fail-catalog`). */
  errorCatalogApp: appPort + 1,
  /** App do caminho de erro do detalhe (`next dev`, mock em `fail-detail`). */
  errorDetailApp: appPort + 2,
  mockOk: appPort + 100,
  mockFailCatalog: appPort + 101,
  mockFailDetail: appPort + 102,
} as const;

export const BASE_URLS = {
  app: localhost(PORTS.app),
  errorCatalogApp: localhost(PORTS.errorCatalogApp),
  errorDetailApp: localhost(PORTS.errorDetailApp),
} as const;

export const MOCK_URLS = {
  ok: localhost(PORTS.mockOk),
  failCatalog: localhost(PORTS.mockFailCatalog),
  failDetail: localhost(PORTS.mockFailDetail),
} as const;

/**
 * `PW_LIVE=1` roda a suite feliz contra a PokeAPI de verdade, sem mock. Serve
 * para pegar mudanca de contrato da API; nao e o padrao nem entra no CI, e os
 * casos calibrados no catalogo sintetico se declaram fora dele.
 */
export const IS_LIVE = Boolean(process.env.PW_LIVE);
