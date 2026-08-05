"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useFilterTransition } from "@/components/search/FilterTransition";
import { PendingIndicator } from "@/components/ui/PendingIndicator";
import type { PokemonType } from "@/lib/api/types";
import { buildQuery, listingHref } from "@/lib/url";

interface TypeFilterProps {
  types: PokemonType[];
}

export function TypeFilter({ types }: TypeFilterProps) {
  const { pending, navigate } = useFilterTransition();
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type") ?? "";

  // Espelho local do valor selecionado. `useTransition` segura a URL antiga ate
  // o Server Component responder, entao ler so o `searchParams` deixaria o
  // `<select>` mostrando o tipo anterior durante toda a espera.
  const [selected, setSelected] = useState(urlType);
  const [syncedType, setSyncedType] = useState(urlType);

  // URL colada, voltar do navegador ou o shell prerenderizado resolvendo os
  // params: o select acompanha. Ajuste durante o render (nao em `useEffect`)
  // para nao pintar um frame com o valor antigo. So dispara quando a URL de fato
  // muda, entao nao desfaz a selecao otimista enquanto a navegacao esta pendente.
  if (syncedType !== urlType) {
    setSyncedType(urlType);
    setSelected(urlType);
  }

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-3xs">
      <label
        htmlFor="pokemon-type"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Filtrar por tipo
      </label>
      {/*
        Indicador unico da barra de filtros: busca e tipo compartilham o mesmo
        pending, entao dois spinners piscando juntos so somariam ruido.

        Fica ao lado, nao sobreposto: o `<select>` nativo ja usa a direita para a
        seta do sistema.
      */}
      <div className="flex items-center gap-2">
        {/*
          `<select>` nativo de proposito: teclado, leitor de tela e o picker do
          sistema no mobile vem de graca. `buildQuery` cuida de zerar a pagina.
        */}
        <select
          id="pokemon-type"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            // Mesma razao do SearchInput: dentro do handler a location e a fonte
            // confiavel da query atual.
            const query = buildQuery(window.location.search, { type: event.target.value });
            navigate(listingHref(query));
          }}
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
        >
          <option value="">Todos os tipos</option>
          {types.map((type) => (
            <option key={type.name} value={type.name} className="capitalize">
              {type.name}
            </option>
          ))}
        </select>
        <PendingIndicator pending={pending} />
      </div>
    </div>
  );
}
