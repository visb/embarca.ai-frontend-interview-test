import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Unit e teste de componente. Server Components assincronos ficam de fora de
 * proposito: os docs do Next dizem que o Vitest nao os suporta e recomendam e2e
 * para eles — quem cobre esse caminho aqui e o Playwright (`e2e/`).
 */
export default defineConfig({
  plugins: [react()],
  // Resolve o alias `@/*` do tsconfig; sem isso todo import do projeto quebraria
  // no teste. Nativo do Vite — o plugin `vite-tsconfig-paths` que os docs do
  // Next citam avisa que virou redundante.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Os dois runners convivem no mesmo repo: sem estes recortes o Vitest tenta
    // rodar os `.spec.ts` do Playwright (e o Playwright, os `.test.tsx` daqui).
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["app/**", "components/**", "lib/**"],
      // Sem threshold numerico: o gate segue qualitativo por story. O relatorio
      // serve para achar caminho nao exercitado, nao para bater porcentagem.
      // Fora da conta: o codigo dos proprios testes e o que so o Playwright
      // alcanca (`e2e/`), que inflaria o denominador sem dizer nada.
      exclude: ["test/**", "e2e/**", "**/*.test.{ts,tsx}"],
    },
  },
});
