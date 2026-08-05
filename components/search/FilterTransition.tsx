"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

/**
 * Estado de navegacao compartilhado pelos controles da listagem.
 *
 * Busca e filtro navegam com `router.replace`, nao com `<Link>` — entao
 * `useLinkStatus` nao se aplica (ele so funciona dentro de um `<Link>`). O
 * equivalente aqui e `useTransition`: o `replace` disparado dentro da transicao
 * mantem `pending` ligado ate o Server Component responder.
 *
 * O provider vive acima dos controles E do resultado, porque os dois precisam do
 * mesmo sinal: o controle mostra o spinner, a grade se esmaece.
 */
interface FilterTransition {
  /** Navegacao de filtro em andamento — inclui a espera do debounce. */
  pending: boolean;
  /**
   * Liga o pending antes de navegar. Sem isso os ~300ms de debounce do
   * `SearchInput` passariam sem sinal nenhum, que e justamente o intervalo em
   * que a tela parecia travada.
   */
  signalPending: () => void;
  /** Navega mantendo o pending ligado ate a nova arvore commitar. */
  navigate: (href: string) => void;
}

const noop = () => {};

const FilterTransitionContext = createContext<FilterTransition>({
  pending: false,
  signalPending: noop,
  navigate: noop,
});

export function useFilterTransition(): FilterTransition {
  return useContext(FilterTransitionContext);
}

export function FilterTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  // Janela entre a tecla e o disparo do debounce. `useTransition` sozinho so
  // acorda no `replace`, tarde demais para o usuario que acabou de digitar.
  const [isAwaitingDebounce, setAwaitingDebounce] = useState(false);

  const signalPending = useCallback(() => setAwaitingDebounce(true), []);

  const navigate = useCallback(
    (href: string) => {
      setAwaitingDebounce(false);
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [router],
  );

  const value = useMemo<FilterTransition>(
    () => ({ pending: isAwaitingDebounce || isNavigating, signalPending, navigate }),
    [isAwaitingDebounce, isNavigating, signalPending, navigate],
  );

  return (
    <FilterTransitionContext.Provider value={value}>{children}</FilterTransitionContext.Provider>
  );
}
