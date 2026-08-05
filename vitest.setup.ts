// Matchers de DOM (`toBeInTheDocument`, `toHaveAttribute`, ...) para todos os
// testes. Sem este import eles nao existem no `expect`.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// A limpeza automatica do RTL so se registra sozinha quando o Vitest roda com
// `globals: true`, que nao e o caso aqui. Sem isso um `render` vaza para o teste
// seguinte e toda query por role vira "found multiple elements".
afterEach(cleanup);
