import { defineConfig, devices } from "@playwright/test";

import { BASE_URLS, IS_LIVE, MOCK_URLS, PORTS } from "./e2e/base-urls";

/**
 * E2E contra o build de producao. E o unico jeito de cobrir Server Component
 * assincrono — que e o caminho principal deste app e o que o Vitest nao roda.
 *
 * `PW_DEV=1` troca para `next dev` quando o ciclo de build atrapalha o feedback
 * local; o padrao continua sendo producao, que e o que a CI precisa medir.
 */
const useDevServer = Boolean(process.env.PW_DEV);

const appCommand = useDevServer ? "pnpm dev" : "pnpm build && pnpm start";

/**
 * Servidor de fixtures da PokeAPI.
 *
 * Sobe antes do app: o `pnpm build` prerenderiza as 100 rotas de detalhe, entao
 * o mock precisa ja estar de pe quando o build comeca. Derrubar o mock derruba o
 * `webServer` — e o que garante que a suite nunca passe verde por ter caido, em
 * silencio, na PokeAPI real.
 */
function mockServer(name: string, port: number, mode: string) {
  return {
    name,
    // O Node apaga os tipos sozinho desde a 22.18; o `--disable-warning` so tira
    // o aviso de "pacote sem type: module", que aqui nao muda nada.
    command: "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON e2e/mock-api/server.ts",
    env: { MOCK_PORT: String(port), MOCK_MODE: mode },
    // `/type` responde 200 em todos os modos — inclusive nos de falha.
    url: `http://localhost:${port}/type`,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  };
}

/**
 * App do caminho de erro.
 *
 * `next dev`, e nao build: o catalogo e cacheado com `cacheLife("max")`, entao
 * um build bem-sucedido responderia do cache e nenhum erro apareceria. Com o
 * mock ja falhando, o `next build` nem completa — o prerender das 100 rotas
 * depende dele. Em dev nada e prerenderizado e a falha acontece no request.
 */
function errorApp(name: string, port: number, mockUrl: string, distDir: string) {
  return {
    name,
    command: "pnpm dev",
    env: { PORT: String(port), POKEAPI_BASE_URL: mockUrl, NEXT_DIST_DIR: distDir },
    // `/robots.txt` nao toca a PokeAPI: e a rota que responde 200 mesmo com o
    // mock em modo de falha, entao serve de sinal de "servidor de pe".
    url: `http://localhost:${port}/robots.txt`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  };
}

/** App do caminho feliz. Sem `POKEAPI_BASE_URL` ele fala com a PokeAPI de verdade. */
function happyApp(env: Record<string, string>) {
  return {
    name: "app",
    command: appCommand,
    env: { PORT: String(PORTS.app), ...env },
    url: BASE_URLS.app,
    // Build de producao pode passar de um minuto na primeira vez.
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  };
}

const happyStack = [
  mockServer("mock ok", PORTS.mockOk, "ok"),
  happyApp({ POKEAPI_BASE_URL: MOCK_URLS.ok }),
];

const errorStack = [
  mockServer("mock fail-catalog", PORTS.mockFailCatalog, "fail-catalog"),
  errorApp(
    "app erro de catalogo",
    PORTS.errorCatalogApp,
    MOCK_URLS.failCatalog,
    ".next-e2e-catalogo",
  ),
  mockServer("mock fail-detail", PORTS.mockFailDetail, "fail-detail"),
  errorApp("app erro de detalhe", PORTS.errorDetailApp, MOCK_URLS.failDetail, ".next-e2e-detalhe"),
];

export default defineConfig({
  testDir: "e2e",
  // Recorte espelhado no `vitest.config.mts`: cada runner so enxerga os seus.
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  // Na CI um `.only` esquecido esconderia o resto da suite.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URLS.app,
    trace: "on-first-retry",
  },
  // So Chromium: a app nao tem codigo especifico de motor, entao rodar tres
  // browsers triplicaria o tempo sem cobrir risco novo.
  projects: IS_LIVE
    ? [
        {
          name: "chromium",
          testIgnore: /[\\/]erros[\\/]/,
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        {
          name: "chromium",
          testIgnore: /[\\/]erros[\\/]/,
          use: { ...devices["Desktop Chrome"] },
        },
        {
          // Projeto separado, e nao um `test.step` no meio da suite feliz: o
          // caminho de erro exige o app subir ja falhando, desde o build.
          name: "chromium-erros",
          testMatch: /[\\/]erros[\\/].*\.spec\.ts$/,
          // Os apps de erro rodam em dev: a primeira visita a cada rota compila.
          timeout: 120_000,
          use: { ...devices["Desktop Chrome"], baseURL: BASE_URLS.errorCatalogApp },
        },
      ],
  // Sem mock em `PW_LIVE=1`: e justamente o modo que checa o contrato real.
  webServer: IS_LIVE ? [happyApp({})] : [...happyStack, ...errorStack],
});
