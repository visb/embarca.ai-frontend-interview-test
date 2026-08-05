"use client";

import { useState } from "react";

import { PendingIndicator } from "@/components/ui/PendingIndicator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TypeOptions } from "@/features/search/components/TypeOptions";
import { useTypeSelection } from "@/features/search/hooks/useTypeSelection";
import { triggerLabel } from "@/features/search/lib/type-selection";
import type { PokemonType } from "@/lib/api/types";

interface TypeFilterProps {
  types: PokemonType[];
}

/**
 * Filtro de tipo com selecao multipla.
 *
 * Os tipos marcados combinam por OU (ver `filterByType`) e viajam na URL como
 * `?type=fire,water`, sempre na ordem do catalogo de tipos. Quem cuida do
 * estado e da navegacao e o `useTypeSelection`; aqui so mora a apresentacao.
 */
export function TypeFilter({ types }: TypeFilterProps) {
  const { selected, pending, toggle, clear } = useTypeSelection(types.map((type) => type.name));
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-3xs">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtrar por tipo</span>
      {/*
        Indicador unico da barra de filtros: busca e tipo compartilham o mesmo
        pending, entao dois spinners piscando juntos so somariam ruido.
      */}
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            // Nome acessivel fixo: o rotulo visivel muda com a selecao, e um
            // nome que muda de valor faz o leitor de tela anunciar um controle
            // diferente a cada mexida.
            aria-label="Filtrar por tipo"
            // Sem `capitalize`: o rotulo tanto e nome de tipo quanto
            // "fire, water +2 tipos" ou "Todos os tipos", que viraria
            // "Todos Os Tipos".
            className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
          >
            {/* `truncate`: rede de seguranca do orcamento de caracteres. */}
            <span className="truncate">{triggerLabel(selected)}</span>
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
            <TypeOptions types={types} selected={selected} onToggle={toggle} onClear={clear} />
          </PopoverContent>
        </Popover>
        <PendingIndicator pending={pending} />
      </div>
    </div>
  );
}
