"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { useFilterTransition } from "@/components/shared/FilterTransition";

interface ClearFiltersActionProps {
  /** Aparencia do ponto de uso: link sublinhado na barra, pilula no estado vazio. */
  className?: string;
  /**
   * Nome acessivel, quando o texto visivel sozinho nao distingue este link do
   * outro. Precisa **conter** o texto visivel (criterio 2.5.3, Label in Name),
   * senao comando de voz deixa de alcancar o link.
   */
  label?: string;
}

/**
 * Ponto unico de "limpar filtros" — a barra e o estado vazio usam o mesmo
 * componente, senao as duas copias divergem na proxima mexida.
 *
 * Continua sendo um `<a>` de verdade: o clique simples e interceptado para a
 * navegacao sair pelo `FilterTransition` (que e o que liga o spinner e esmaece a
 * grade), mas o `href` real preserva Ctrl/Cmd+clique, botao do meio, menu de
 * contexto e "copiar endereco". Virar `<button>` jogaria isso fora por nada.
 *
 * O texto visivel e o mesmo nos dois lugares de proposito — dois rotulos para a
 * mesma acao na mesma tela trocaria um problema por outro. Quem os distingue e
 * o `label`.
 */
export function ClearFiltersAction({ className, label }: ClearFiltersActionProps) {
  const { clearFilters } = useFilterTransition();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Modificador ou botao secundario: o navegador esta abrindo em outra aba ou
    // janela, e ai a limpeza otimista desta aba seria justamente o errado.
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    clearFilters();
  }

  return (
    <Link href="/" className={className} aria-label={label} onClick={handleClick}>
      Limpar filtros
    </Link>
  );
}
