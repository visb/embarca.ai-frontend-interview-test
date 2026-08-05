"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { PokemonType } from "@/lib/api/types";

interface TypeOptionsProps {
  types: PokemonType[];
  selected: string[];
  onToggle: (type: string, checked: boolean) => void;
  onClear: () => void;
}

/** Conteudo do dropdown: uma caixa por tipo, mais o atalho de limpar. */
export function TypeOptions({ types, selected, onToggle, onClear }: TypeOptionsProps) {
  return (
    <>
      <fieldset className="min-w-0">
        <legend className="sr-only">Tipos</legend>
        {/*
          Duas colunas, mas a ordem de leitura continua a do DOM
          (esquerda -> direita, linha a linha) — que e a que o Tab e o leitor
          de tela seguem. Abaixo de 380px cai para uma coluna.
        */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 min-[380px]:grid-cols-2">
          {types.map((type) => (
            <div key={type.name} className="flex items-center gap-2">
              <Checkbox
                id={`type-${type.name}`}
                checked={selected.includes(type.name)}
                onCheckedChange={(checked) => onToggle(type.name, checked === true)}
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
          onClick={onClear}
          className="self-start rounded text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100"
        >
          Limpar tipos
        </button>
      ) : null}
    </>
  );
}
