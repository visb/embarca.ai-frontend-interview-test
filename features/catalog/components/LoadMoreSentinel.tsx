"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface LoadMoreSentinelProps {
  /** Falso enquanto carrega, no fim da lista ou apos erro. */
  enabled: boolean;
  onVisible: () => void;
  children: ReactNode;
}

/**
 * Dispara o carregamento quando a base da lista se aproxima da viewport.
 *
 * Uma carga por interseccao *assentada*: o callback do observer e a unica
 * origem de disparo, e cada disparo desarma o sentinel. Depois que a fatia
 * chega, o rearme acontece num frame posterior e forca o observer a reavaliar a
 * ancora — nunca a partir de um valor de visibilidade guardado antes de o
 * layout novo existir.
 *
 * Esse passo e o ponto todo. Guardar a visibilidade em estado e reagir a ela
 * fazia a fatia recem-anexada disparar a seguinte mesmo tendo empurrado a base
 * para fora da tela, e transformava tabular pelos cards (que rola a pagina) em
 * "carregar o catalogo inteiro" para quem navega por teclado. Se a base
 * continuar intersectando depois de a fatia ser pintada — viewport mais alta
 * que a fatia —, o observer avisa de novo e a lista encadeia, que e o caso
 * legitimo.
 *
 * O observer so antecipa o que o botao dentro dele faria: quem navega por
 * teclado ou leitor de tela nunca gera evento de scroll, entao o gatilho
 * acessivel precisa existir de verdade, nao como fallback escondido.
 */
export function LoadMoreSentinel({ enabled, onVisible, children }: LoadMoreSentinelProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const frameRef = useRef<number | null>(null);
  const armedRef = useRef(true);

  // O callback do observer e criado uma vez so; sem os refs ele dependeria da
  // identidade de `onVisible` e do valor de `enabled` do render em que nasceu.
  const enabledRef = useRef(enabled);
  const onVisibleRef = useRef(onVisible);
  useEffect(() => {
    enabledRef.current = enabled;
    onVisibleRef.current = onVisible;
  });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || !enabledRef.current || !armedRef.current) return;

        armedRef.current = false;
        onVisibleRef.current();
      },
      // Carrega um pouco antes do fim, para a fatia chegar durante a rolagem.
      { rootMargin: "200px" },
    );

    observerRef.current = observer;
    observer.observe(anchor);

    return () => {
      observerRef.current = null;
      observer.disconnect();
    };
  }, []);

  // Pula o primeiro run: no mount o observer acabou de nascer e ja entrega a
  // interseccao inicial sozinho. Rearmar ali produziria duas leituras do mesmo
  // estado, que e o encadeamento que esta story existe para tirar.
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!enabled) return;

    const anchor = anchorRef.current;
    const observer = observerRef.current;
    if (!anchor || !observer) return;

    // Um frame depois: e o que espera a fatia recem-anexada entrar no layout.
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      armedRef.current = true;
      // Reobservar forca uma leitura nova da ancora. Sem isso o observer fica
      // em silencio com a base ainda visivel — ele so avisa quando a
      // interseccao *muda* — e a lista travaria esperando um clique.
      observer.unobserve(anchor);
      observer.observe(anchor);
    });

    // Trocar de filtro remonta a lista (`key` na pagina): nenhum frame agendado
    // pode sobreviver a isso.
    return () => {
      if (frameRef.current === null) return;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [enabled]);

  return <div ref={anchorRef}>{children}</div>;
}
