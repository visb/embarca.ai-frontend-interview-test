// Matchers de DOM (`toBeInTheDocument`, `toHaveAttribute`, ...) para todos os
// testes. Sem este import eles nao existem no `expect`.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// A limpeza automatica do RTL so se registra sozinha quando o Vitest roda com
// `globals: true`, que nao e o caso aqui. Sem isso um `render` vaza para o teste
// seguinte e toda query por role vira "found multiple elements".
afterEach(cleanup);

/**
 * O jsdom nao implementa `ResizeObserver`, e a grade virtual depende dele para
 * saber quantas colunas cabem. Este stub e inerte de proposito: nunca dispara
 * sozinho, entao nenhum teste ganha um render surpresa. Quem precisa observar
 * uma mudanca de largura instala o proprio com `vi.stubGlobal`.
 */
class InertResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= InertResizeObserver;

/**
 * O jsdom tambem nao implementa `scrollTo`, e o virtualizer chama para corrigir
 * a posicao quando remede uma linha acima da dobra. Sem este no-op cada teste da
 * grade enche a saida de "Not implemented: Window's scrollTo()".
 */
window.scrollTo = () => {};
