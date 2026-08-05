import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Slices verticais. Cada nome vira uma zona: dentro de `features/<slice>/` so
 * se importa o proprio slice e o que e compartilhado (`lib/`, `components/ui/`).
 *
 * Adicionar dominio novo aqui e o que liga a trava para ele — sem isso o slice
 * nasce sem fronteira.
 */
const SLICES = ["catalog", "search", "pokemon-detail"];

/** Arquivos de UI: o alvo dos limites de tamanho. */
const UI_FILES = ["components/**/*.tsx", "features/**/*.tsx", "app/**/*.tsx"];

/**
 * Divida herdada: arquivos que ja nasceram acima do limite, antes da regra
 * existir. Cada um sai desta lista na story que migra o slice dele (ver o
 * CLAUDE.md, "Responsabilidade unica, na pratica") — a lista so encolhe.
 *
 * Novo arquivo NAO entra aqui. Se um codigo novo precisa da excecao, ele
 * precisa e de ser quebrado.
 */
const OVERSIZED_LEGACY = [
  "components/search/TypeFilter.tsx",
  "components/pokemon/VirtualGrid.tsx",
  "components/search/SearchInput.tsx",
];

/** Uma zona por slice: barra import que atravessa a fronteira de outro slice. */
const sliceBoundaries = SLICES.map((slice) => ({
  files: [`features/${slice}/**`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/features/*/**", `!@/features/${slice}/**`],
            message:
              "Slice nao importa o interior de outro slice. Suba o que e comum para `lib/`, `lib/api/` ou `components/ui/`.",
          },
        ],
      },
    ],
  },
}));

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
  {
    // Rota so compoe: quem tem regra e a camada de dado do slice.
    files: ["app/**/*.tsx", "app/**/*.ts"],
    ignores: ["app/**/*.test.*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/lib/**", "@/features/*/hooks/**"],
              message:
                "A rota compoe: chame a `<Dominio>Page` ou o `data.ts` do slice, nao o interior dele.",
            },
          ],
        },
      ],
    },
  },
  ...sliceBoundaries,
  {
    /**
     * Limite de tamanho como gate, e nao como gosto: o arquivo grande aqui e
     * sempre o mesmo sintoma — regra pura, estado e markup no mesmo lugar. O
     * destino de cada pedaco esta no CLAUDE.md.
     *
     * Comentario e linha em branco nao contam: este projeto documenta o porque
     * das decisoes no proprio arquivo, e cobrar isso empurraria na direcao
     * errada.
     */
    files: UI_FILES,
    ignores: ["**/*.test.tsx", ...OVERSIZED_LEGACY],
    rules: {
      "max-lines": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
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
