/**
 * Colunas da grade da listagem.
 *
 * Ate a virtualizacao quem decidia isso era so o CSS (`sm:grid-cols-2
 * lg:grid-cols-3 xl:grid-cols-4`, no `PokemonGrid`). O virtualizer precisa do
 * numero em JS para saber quantos itens cabem numa linha, e manter os dois
 * lados seria duas verdades divergindo no primeiro ajuste de breakpoint —
 * entao o JS passa a ser a fonte da verdade e o `VirtualGrid` escreve o
 * `gridTemplateColumns` inline a partir daqui.
 *
 * Os valores sao os breakpoints do Tailwind (`sm`, `lg`, `xl`) usados por
 * aquelas classes. Manter os dois em sincronia e o ponto: enquanto baterem, o
 * markup que o servidor manda e o que o modo virtual monta tem a mesma grade, e
 * hidratar nao move nenhum card de lugar.
 */
export const GRID_BREAKPOINTS = { sm: 640, lg: 1024, xl: 1280 } as const;

export type GridColumns = 1 | 2 | 3 | 4;

/**
 * Colunas para uma largura de *viewport* — a mesma medida das media queries do
 * Tailwind, e nao a largura do container (que tem `max-w-6xl` e gutters, e por
 * isso daria menos colunas do que o CSS aplicou).
 *
 * Nunca devolve 0: a largura chega 0 antes da primeira medicao, e o `rowCount`
 * do virtualizer divide por este numero.
 */
export function columnsForWidth(width: number): GridColumns {
  if (width >= GRID_BREAKPOINTS.xl) return 4;
  if (width >= GRID_BREAKPOINTS.lg) return 3;
  if (width >= GRID_BREAKPOINTS.sm) return 2;
  return 1;
}
