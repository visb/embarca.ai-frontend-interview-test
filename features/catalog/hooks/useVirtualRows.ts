"use client";

import { useWindowVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ESTIMATED_ROW_HEIGHT, OVERSCAN, ROW_GAP } from "@/features/catalog/constants";
import { useGridColumns } from "@/features/catalog/hooks/useGridColumns";
import type { GridColumns } from "@/features/catalog/lib/grid";

/*
  Ingredientes do "ja hidratou?".

  `useSyncExternalStore` em vez de `useState` + `useEffect`: o React usa o
  snapshot do servidor no render que hidrata e so entao troca para o do cliente
  — que e exatamente a fronteira que interessa aqui —, sem o setState dentro de
  efeito que dispara render em cascata.
*/
const NEVER_CHANGES = () => () => {};
const ON_CLIENT = () => true;
const ON_SERVER = () => false;

interface VirtualRows {
  /** Antes de hidratar a grade e o HTML do servidor, sem virtualizacao. */
  hydrated: boolean;
  columns: GridColumns;
  /** Ref do container: mede a margem de rolagem e liga o observer de colunas. */
  attachContainer: (node: HTMLDivElement | null) => void;
  virtualizer: Virtualizer<Window, Element>;
  /** Distancia entre o topo da pagina e o topo da grade. */
  scrollMargin: number;
}

/**
 * Janela de linhas montadas da grade.
 *
 * Virtualiza por *linha*, nao por card: a unidade do virtualizer e a linha da
 * grade, com os cards dela renderizados juntos. Scroll da janela, e nao
 * container de altura fixa — assim o sentinel do scroll infinito e a restauracao
 * de posicao ao voltar do detalhe continuam valendo sem reescrita.
 */
export function useVirtualRows(itemCount: number): VirtualRows {
  /*
    O servidor manda a fatia como HTML normal e o primeiro render do cliente
    repete exatamente esse markup — sem isso, o range calculado no cliente nao
    bateria com o que veio pronto e a hidratacao acusaria mismatch. A
    virtualizacao so assume no render seguinte, ja no cliente.
  */
  const hydrated = useSyncExternalStore(NEVER_CHANGES, ON_CLIENT, ON_SERVER);

  const { ref: columnsRef, columns } = useGridColumns();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const measureScrollMargin = useCallback(() => {
    const node = containerRef.current;
    if (node) setScrollMargin(node.getBoundingClientRect().top + window.scrollY);
  }, []);

  /*
    A grade nao comeca no topo da janela — abaixo dela ficam o `h1`, a barra de
    filtros e o contador. Sem `scrollMargin` o virtualizer trata o topo da
    janela como topo da lista e erra o range por essa distancia.
  */
  const attachContainer = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      columnsRef(node);
      // Medido no proprio callback de ref, que o React roda antes de pintar: num
      // `useEffect` o primeiro quadro virtual sairia com margem 0.
      measureScrollMargin();
    },
    [columnsRef, measureScrollMargin],
  );

  // Trocar de breakpoint reflui a barra de filtros acima da grade, e a margem
  // muda junto.
  useEffect(() => {
    measureScrollMargin();
  }, [measureScrollMargin, columns]);

  // A chave carrega o numero de colunas porque a composicao das linhas muda com
  // ele: sem isso, as alturas medidas com 4 colunas seguiriam valendo depois de
  // a grade cair para 1.
  const rowKey = useCallback((index: number) => `${columns}:${index}`, [columns]);

  const virtualizer = useWindowVirtualizer({
    count: Math.ceil(itemCount / columns),
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN,
    gap: ROW_GAP,
    scrollMargin,
    getItemKey: rowKey,
    enabled: hydrated,
  });

  return { hydrated, columns, attachContainer, virtualizer, scrollMargin };
}
