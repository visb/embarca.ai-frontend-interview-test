/** Calibracao da grade virtual. */

/**
 * Altura chutada da linha. Vale so ate a primeira medicao: o card tem imagem
 * `aspect-square`, entao a altura real depende da largura da coluna e sai do
 * `measureElement`.
 */
export const ESTIMATED_ROW_HEIGHT = 320;

/** Espaco entre linhas. Espelha o `gap-4` da grade. */
export const ROW_GAP = 16;

/**
 * Linhas montadas alem da janela. Tres cobrem o Tab para o card logo abaixo da
 * dobra e reduzem o branco na rolagem rapida.
 */
export const OVERSCAN = 3;
