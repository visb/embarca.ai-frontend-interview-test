"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useFilterTransition } from "@/components/shared/FilterTransition";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingIndicator } from "@/components/ui/PendingIndicator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PokemonType } from "@/lib/api/types";
import { parseTypeParams } from "@/lib/search-params";
import { buildQuery, listingHref } from "@/lib/url";

interface TypeFilterProps {
  types: PokemonType[];
}

/**
 * Orcamento de caracteres do rotulo do gatilho.
 *
 * Contagem de caracteres, e nao medicao de largura: medir exigiria ler layout
 * no cliente e faria o rotulo mudar entre servidor e hidratacao. O numero e
 * calibrado para a largura do controle (`sm:max-w-3xs`) menos o chevron; o
 * `truncate` do span cobre o caso de nome excepcionalmente longo.
 */
const MAX_LABEL_CHARS = 24;

/**
 * Rotulo do gatilho: o que esta filtrado, sem obrigar a abrir o dropdown.
 *
 * Mostra os nomes enquanto couberem. Quando nao cabem, os dois primeiros mais
 * a contagem do resto — "fire, water +2 tipos" diz mais que "4 tipos" e nao
 * estoura o controle. Ate dois tipos o nome sempre aparece: cortar ali daria
 * "+0 tipos".
 */
function triggerLabel(selected: string[]): string {
  if (selected.length === 0) return "Todos os tipos";

  const full = selected.join(", ");
  if (selected.length <= 2 || full.length <= MAX_LABEL_CHARS) return full;

  const restantes = selected.length - 2;
  return `${selected.slice(0, 2).join(", ")} +${restantes} ${restantes === 1 ? "tipo" : "tipos"}`;
}

/**
 * Filtro de tipo com selecao multipla.
 *
 * Os tipos marcados combinam por OU (ver `filterByType`) e viajam na URL como
 * `?type=fire,water`, sempre na ordem do catalogo de tipos — a ordem de clique
 * geraria URLs diferentes para o mesmo resultado.
 *
 * **Cada caixa navega na hora**, sem esperar o dropdown fechar: a lista atras
 * dele recarrega junto, e quem esta marcando ve o efeito de cada escolha em vez
 * de descobrir tudo no fim. O custo aceito e um round-trip por caixa; o mesmo
 * `useTransition` dos outros controles cobre a espera, entao o spinner e o
 * `aria-busy` da grade ja vem de graca.
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

  /** Aplica o conjunto novo: espelho local primeiro, URL em seguida. */
  function apply(next: string[]) {
    setSelected(next);
    // Mesma razao do SearchInput: dentro do handler a location e a fonte
    // confiavel da query atual. O `type` e sobrescrito inteiro a partir do
    // estado local, entao nao depende de a URL ja ter commitado.
    navigate(listingHref(buildQuery(window.location.search, { type: next })));
  }

  function toggle(type: string, checked: boolean) {
    // Reconstroi na ordem canonica em vez de anexar: o estado local nunca guarda
    // ordem de clique, entao a URL ja sai na ordem do catalogo.
    apply(knownTypes.filter((known) => (known === type ? checked : selected.includes(known))));
  }

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
                onClick={() => apply([])}
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
