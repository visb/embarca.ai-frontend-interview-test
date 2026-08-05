"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { PokemonCard } from "@/components/pokemon/PokemonCard";
import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { useGridColumns } from "@/components/pokemon/useGridColumns";
import type { PokemonSummary } from "@/lib/api/types";

interface VirtualGridProps {
  items: PokemonSummary[];
  /** Titulo do estado vazio — a busca e o filtro passam mensagens especificas. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Query atual da listagem, repassada aos cards para o link de volta. */
  listingQuery?: string;
}

/**
 * Altura chutada da linha. Vale so ate a primeira medicao: o card tem imagem
 * `aspect-square`, entao a altura real depende da largura da coluna e sai do
 * `measureElement`.
 */
const ESTIMATED_ROW_HEIGHT = 320;

/** Espaco entre linhas. Espelha o `gap-4` da grade. */
const ROW_GAP = 16;

/**
 * Linhas montadas alem da janela. Tres cobrem o Tab para o card logo abaixo da
 * dobra e reduzem o branco na rolagem rapida.
 */
const OVERSCAN = 3;

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

/**
 * Grade da listagem que so monta as linhas visiveis.
 *
 * O ganho de performance aqui e teorico: com 100 itens e 4 colunas sao ~25
 * linhas no pior caso, e nenhuma metrica se move. O que a virtualizacao entrega
 * neste projeto e comportamento — o DOM para de crescer junto com a lista — e a
 * demonstracao da tecnica. Ver a entrada correspondente no `README.md`.
 *
 * Scroll da janela, e nao container de altura fixa: o `LoadMoreSentinel`, o
 * `IntersectionObserver` do scroll infinito e a restauracao de posicao ao voltar
 * do detalhe continuam valendo sem reescrita, e o layout da pagina nao muda.
 *
 * Virtualiza por *linha*, nao por card: a unidade do virtualizer e a linha da
 * grade, com os cards dela renderizados juntos.
 */
export function VirtualGrid({
  items,
  emptyTitle,
  emptyDescription,
  emptyAction,
  listingQuery,
}: VirtualGridProps) {
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
    count: Math.ceil(items.length / columns),
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN,
    gap: ROW_GAP,
    scrollMargin,
    getItemKey: rowKey,
    enabled: hydrated,
  });

  /*
    Lista vazia e pre-hidratacao caem no mesmo lugar: o markup do servidor. Sem
    itens nao ha o que virtualizar, e o `PokemonGrid` ja sabe montar o estado
    vazio com o titulo, a descricao e a saida que a listagem passou.
  */
  if (!hydrated || items.length === 0) {
    return (
      <PokemonGrid
        items={items}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={emptyAction}
        listingQuery={listingQuery}
      />
    );
  }

  return (
    /*
      `role="list"` em vez de `<ul>`: com as linhas posicionadas em absoluto, um
      `<li>` por linha anunciaria "25 itens" para uma lista de 100, e aninhar
      listas seria pior. Cada card volta a ser um `listitem`, e as linhas ficam
      como `presentation` para nao entrar no meio dessa relacao.
    */
    <div
      ref={attachContainer}
      role="list"
      style={{ position: "relative", height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((row) => {
        const first = row.index * columns;
        const rowItems = items.slice(first, first + columns);

        return (
          <div
            key={row.key}
            // Lido pelo `measureElement` para saber qual linha mediu.
            data-index={row.index}
            ref={virtualizer.measureElement}
            role="presentation"
            className="grid gap-4"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${row.start - scrollMargin}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {rowItems.map((pokemon, column) => (
              <PokemonCard
                key={pokemon.id}
                pokemon={pokemon}
                listingQuery={listingQuery}
                // Posicao na lista logica: com o DOM parcial, e o que faz o
                // leitor de tela anunciar "40 de 100" em vez de "4 de 12".
                setSize={items.length}
                posInSet={first + column + 1}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
