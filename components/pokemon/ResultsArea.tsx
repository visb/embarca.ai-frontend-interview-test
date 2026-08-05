"use client";

import type { ReactNode } from "react";

import { useFilterTransition } from "@/components/shared/FilterTransition";

/**
 * Casca cliente fina em volta do resultado: le o pending dos filtros e sinaliza
 * que a lista exibida esta desatualizada.
 *
 * Fina de proposito — os cards continuam sendo Server Components, passados como
 * `children`. Nada aqui re-renderiza o conteudo, so a classe do container.
 *
 * Esmaece em vez de trocar por skeleton: durante a digitacao, piscar a grade
 * inteira a cada tecla e mais ruido que informacao. O atraso na transicao evita
 * o flash quando a navegacao resolve rapido.
 */
export function ResultsArea({ children }: { children: ReactNode }) {
  const { pending } = useFilterTransition();

  return (
    <div
      aria-busy={pending}
      className={`transition-opacity duration-200 motion-reduce:transition-none ${
        pending ? "opacity-50 delay-100" : "opacity-100"
      }`}
    >
      {children}
    </div>
  );
}
