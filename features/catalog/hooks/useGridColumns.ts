"use client";

import { useEffect, useState } from "react";

import { columnsForWidth, type GridColumns } from "@/features/catalog/lib/grid";

/**
 * Medida que decide os breakpoints.
 *
 * `clientWidth` da raiz, e nao `window.innerWidth`: e a largura que as media
 * queries enxergam (a barra de rolagem classica fica de fora). Com
 * `innerWidth`, uma viewport de exatamente 1280 com barra visivel daria 4
 * colunas em JS e 3 no CSS — e a grade saltaria ao hidratar.
 */
function viewportWidth(): number {
  return document.documentElement.clientWidth;
}

/**
 * Colunas do primeiro render.
 *
 * No servidor nao ha o que medir, e no cliente a leitura pode ser feita de
 * imediato: a grade virtual so entra em cena depois de hidratar, entao este
 * valor nunca chega a sair no HTML. Medir aqui, e nao num efeito, e o que faz o
 * modo virtual estrear ja com o numero certo de colunas em vez de piscar em uma.
 */
function initialColumns(): GridColumns {
  return typeof document === "undefined" ? 1 : columnsForWidth(viewportWidth());
}

/**
 * Quantas colunas a grade tem agora.
 *
 * Devolve um callback ref, e nao um `useRef`: o `ResizeObserver` so pode ser
 * ligado depois que o container existe, e ele aparece um render *depois* do
 * primeiro. Um objeto de ref nao avisaria a hora de observar.
 *
 * Observa o container, mas mede a viewport: o container e o elemento cujo
 * layout precisa acompanhar, e ele muda de tamanho exatamente quando a janela
 * muda — so que quem manda nas colunas e a media query.
 */
export function useGridColumns(): {
  ref: (node: HTMLDivElement | null) => void;
  columns: GridColumns;
} {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState<GridColumns>(initialColumns);

  useEffect(() => {
    if (!node) return;

    // O `ResizeObserver` entrega uma primeira observacao assim que passa a
    // observar, entao nao ha leitura manual aqui: a medicao inicial e a de cada
    // resize chegam pelo mesmo caminho.
    const observer = new ResizeObserver(() =>
      setColumns((current) => {
        const next = columnsForWidth(viewportWidth());
        // Devolver o mesmo valor faz o React desistir do render: largura que
        // muda sem cruzar breakpoint nao remonta a grade inteira.
        return next === current ? current : next;
      }),
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, columns };
}
