import { defineConfig, devices } from "@playwright/test";

// `PORT` e respeitado tanto pelo `next start` quanto pelo `next dev`, entao dar
// outra porta e o jeito de rodar a suite sem esbarrar num servidor ja aberto.
const port = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

/**
 * E2E contra o build de producao. E o unico jeito de cobrir Server Component
 * assincrono — que e o caminho principal deste app e o que o Vitest nao roda.
 *
 * `PW_DEV=1` troca para `next dev` quando o ciclo de build atrapalha o feedback
 * local; o padrao continua sendo producao, que e o que a CI precisa medir.
 */
const useDevServer = Boolean(process.env.PW_DEV);

export default defineConfig({
  testDir: "e2e",
  // Recorte espelhado no `vitest.config.mts`: cada runner so enxerga os seus.
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  // Na CI um `.only` esquecido esconderia o resto da suite.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // So Chromium: a app nao tem codigo especifico de motor, entao rodar tres
  // browsers triplicaria o tempo sem cobrir risco novo.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: useDevServer ? "pnpm dev" : "pnpm build && pnpm start",
    url: baseURL,
    // Build de producao pode passar de um minuto na primeira vez.
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
