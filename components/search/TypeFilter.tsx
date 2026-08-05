"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useFilterTransition } from "@/components/search/FilterTransition";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingIndicator } from "@/components/ui/PendingIndicator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PokemonType } from "@/lib/api/types";
import { parseTypeParams } from "@/lib/search-params";
import { buildQuery, listingHref } from "@/lib/url";

interface TypeFilterProps {
  types: PokemonType[];
}

/** Rotulo do gatilho: o que esta filtrado, sem obrigar a abrir o dropdown. */
function triggerLabel(selected: string[]): string {
  if (selected.length === 0) return "Todos os tipos";
  if (selected.length === 1) return selected[0];
  return `${selected.length} tipos`;
}

/**
 * Filtro de tipo com selecao multipla.
 *
 * Os tipos marcados combinam por OU (ver `filterByType`) e viajam na URL como
 * `?type=fire,water`, sempre na ordem do catalogo de tipos — a ordem de clique
 * geraria URLs diferentes para o mesmo resultado.
 *
 * **A navegacao acontece ao fechar, nao a cada caixa.** Marcar quatro tipos
 * dispararia quatro round-trips ao servidor e quatro remounts da lista. O
 * estado das caixas e local; ao fechar, se o conjunto mudou em relacao a URL,
 * navega uma vez so.
 */
export function TypeFilter({ types }: TypeFilterProps) {
  const { pending, navigate, clearToken } = useFilterTransition();
  const searchParams = useSearchParams();
  const knownTypes = types.map((type) => type.name);
  const urlTypes = parseTypeParams(searchParams.get("type") ?? undefined, knownTypes);
  // Chave canonica: comparar arrays por conteudo em varios pontos convidaria a
  // uma comparacao errada em algum deles.
  const urlKey = urlTypes.join(",");

  const [open, setOpen] = useState(false);

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

  function toggle(type: string, checked: boolean) {
    setSelected((current) => {
      const next = checked ? [...current, type] : current.filter((entry) => entry !== type);
      // Reordena pela lista canonica a cada mexida: o estado local nunca guarda
      // ordem de clique, entao a URL montada no fechamento ja sai canonica.
      return knownTypes.filter((known) => next.includes(known));
    });
  }

  function commit(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) return;

    // Fechar sem mexer em nada nao navega — nada mudou para o servidor dizer.
    if (selected.join(",") === urlKey) return;

    // Mesma razao do SearchInput: dentro do handler a location e a fonte
    // confiavel da query atual.
    navigate(listingHref(buildQuery(window.location.search, { type: selected })));
  }

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-3xs">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtrar por tipo</span>
      {/*
        Indicador unico da barra de filtros: busca e tipo compartilham o mesmo
        pending, entao dois spinners piscando juntos so somariam ruido.
      */}
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={commit}>
          <PopoverTrigger
            // Nome acessivel fixo: o rotulo visivel muda com a selecao, e um
            // nome que muda de valor faz o leitor de tela anunciar um controle
            // diferente a cada mexida.
            aria-label="Filtrar por tipo"
            // Sem `capitalize`: o rotulo tanto e um nome de tipo quanto
            // "2 tipos" ou "Todos os tipos", que viraria "2 Tipos".
            className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
          >
            {triggerLabel(selected)}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </PopoverTrigger>
          {/*
            O popover do Radix e `role="dialog"`, e dialogo sem nome acessivel e
            violacao serious no axe — o `<legend>` do fieldset nomeia o grupo de
            caixas, nao o container.
          */}
          <PopoverContent align="start" aria-label="Tipos" className="w-64">
            <fieldset className="min-w-0">
              <legend className="sr-only">Tipos</legend>
              {/*
                Duas colunas, mas a ordem de leitura continua a do DOM
                (esquerda -> direita, linha a linha) — que e a que o Tab e o
                leitor de tela seguem. Abaixo de 380px cai para uma coluna.
              */}
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 min-[380px]:grid-cols-2">
                {types.map((type) => (
                  <div key={type.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${type.name}`}
                      checked={selected.includes(type.name)}
                      onCheckedChange={(checked) => toggle(type.name, checked === true)}
                    />
                    <label
                      htmlFor={`type-${type.name}`}
                      className="cursor-pointer text-sm text-zinc-800 capitalize dark:text-zinc-200"
                    >
                      {type.name}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="self-start rounded text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100"
              >
                Limpar tipos
              </button>
            ) : null}
          </PopoverContent>
        </Popover>
        <PendingIndicator pending={pending} />
      </div>
    </div>
  );
}
