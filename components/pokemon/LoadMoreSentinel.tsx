"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface LoadMoreSentinelProps {
  /** Falso enquanto carrega, no fim da lista ou apos erro. */
  enabled: boolean;
  onVisible: () => void;
  children: ReactNode;
}

/**
 * Dispara o carregamento quando a base da lista se aproxima da viewport.
 *
 * A visibilidade vira estado em vez de chamar direto do callback do observer:
 * o `IntersectionObserver` so avisa quando a interseccao *muda*, e depois de
 * anexar uma fatia a base costuma continuar visivel — sem reavaliar, o scroll
 * carregaria uma vez so e travava.
 *
 * O observer so antecipa o que o botao dentro dele faria: quem navega por
 * teclado ou leitor de tela nunca gera evento de scroll, entao o gatilho
 * acessivel precisa existir de verdade, nao como fallback escondido.
 */
export function LoadMoreSentinel({ enabled, onVisible, children }: LoadMoreSentinelProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      // Carrega um pouco antes do fim, para a fatia chegar durante a rolagem.
      { rootMargin: "200px" },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (enabled && isVisible) onVisible();
  }, [enabled, isVisible, onVisible]);

  return <div ref={anchorRef}>{children}</div>;
}
