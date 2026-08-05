/**
 * Badge de tipo de pokemon.
 *
 * As cores sao tints claros com texto escuro do mesmo matiz (e o inverso no
 * tema escuro) em vez das cores "oficiais" saturadas: varias delas — electric,
 * ice, ground — nao alcancam 4.5:1 com texto branco.
 */

const TYPE_CLASSES: Record<string, string> = {
  normal: "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-100",
  fire: "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
  water: "bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  electric: "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  grass: "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100",
  ice: "bg-cyan-200 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100",
  fighting: "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100",
  poison: "bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-900 dark:text-fuchsia-100",
  ground: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",
  flying: "bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100",
  psychic: "bg-pink-200 text-pink-900 dark:bg-pink-900 dark:text-pink-100",
  bug: "bg-lime-200 text-lime-900 dark:bg-lime-900 dark:text-lime-100",
  rock: "bg-amber-300 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  ghost: "bg-violet-200 text-violet-900 dark:bg-violet-900 dark:text-violet-100",
  dragon: "bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
  dark: "bg-neutral-300 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
  steel: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  fairy: "bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100",
};

/** Tipo desconhecido nao pode quebrar a UI: cai num estilo neutro. */
const FALLBACK_CLASSES = "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";

interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const classes = TYPE_CLASSES[type] ?? FALLBACK_CLASSES;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {type}
    </span>
  );
}
