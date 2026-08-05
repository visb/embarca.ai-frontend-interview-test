"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useFilterTransition } from "@/components/shared/FilterTransition";
import { toggleType } from "@/features/search/lib/type-selection";
import { parseTypeParams } from "@/lib/search-params";
import { buildQuery, listingHref } from "@/lib/url";

interface TypeSelection {
  /** Tipos marcados agora, ja na ordem do catalogo. */
  selected: string[];
  /** Navegacao de filtro em andamento — compartilhado com os outros controles. */
  pending: boolean;
  toggle: (type: string, checked: boolean) => void;
  clear: () => void;
}

/**
 * Selecao de tipos do filtro: espelho local, sincronizacao com a URL e navegacao.
 *
 * **Cada marcacao navega na hora**, sem esperar o dropdown fechar: a lista atras
 * dele recarrega junto, e quem esta marcando ve o efeito de cada escolha em vez
 * de descobrir tudo no fim. O custo aceito e um round-trip por caixa; a espera
 * reusa o `useTransition` dos outros controles, entao o spinner e o `aria-busy`
 * da grade ja vem de graca.
 */
export function useTypeSelection(knownTypes: string[]): TypeSelection {
  const { pending, navigate, clearToken } = useFilterTransition();
  const searchParams = useSearchParams();
  const urlTypes = parseTypeParams(searchParams.get("type") ?? undefined, knownTypes);
  // Chave canonica: comparar arrays por conteudo em varios pontos convidaria a
  // uma comparacao errada em algum deles.
  const urlKey = urlTypes.join(",");

  // Espelho local do conjunto marcado. `useTransition` segura a URL antiga ate o
  // Server Component responder, entao ler so o `searchParams` deixaria o
  // controle mostrando a selecao anterior durante toda a espera.
  const [selected, setSelected] = useState(urlTypes);
  const [syncedKey, setSyncedKey] = useState(urlKey);

  // URL colada, voltar do navegador ou o shell prerenderizado resolvendo os
  // params: o controle acompanha. Ajuste durante o render (nao em `useEffect`)
  // para nao pintar um frame com o valor antigo. So dispara quando a URL de fato
  // muda, entao nao desfaz a selecao otimista enquanto a navegacao esta pendente.
  if (syncedKey !== urlKey) {
    setSyncedKey(urlKey);
    setSelected(urlTypes);
  }

  // "Limpar filtros" zera o controle na hora, sem esperar a URL commitar.
  const [syncedClearToken, setSyncedClearToken] = useState(clearToken);
  if (syncedClearToken !== clearToken) {
    setSyncedClearToken(clearToken);
    setSelected([]);
  }

  /** Aplica o conjunto novo: espelho local primeiro, URL em seguida. */
  function apply(next: string[]) {
    setSelected(next);
    // Mesma razao do campo de busca: dentro do handler a location e a fonte
    // confiavel da query atual. O `type` e sobrescrito inteiro a partir do
    // estado local, entao nao depende de a URL ja ter commitado.
    navigate(listingHref(buildQuery(window.location.search, { type: next })));
  }

  return {
    selected,
    pending,
    toggle: (type, checked) => apply(toggleType(knownTypes, selected, type, checked)),
    clear: () => apply([]),
  };
}
