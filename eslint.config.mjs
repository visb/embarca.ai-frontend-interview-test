import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Regras que travam problema real. Estilo e com o Prettier — repetir isso
    // aqui so gera conflito entre as duas ferramentas.
    rules: {
      // `any` desliga a checagem justamente onde ela mais importa: no limite
      // entre a resposta crua da PokeAPI e o modelo de dominio.
      "@typescript-eslint/no-explicit-any": "error",
      // Import de tipo que sobra no bundle e peso morto em Client Component.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Builds paralelos que a suite e2e sobe para o caminho de erro.
    ".next-e2e-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatos gerados: o relatorio HTML do `test:coverage` traz JS de
    // terceiros que nao e codigo deste projeto.
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
