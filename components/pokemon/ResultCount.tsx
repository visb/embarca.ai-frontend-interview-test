interface ResultCountProps {
  total: number;
  /** Quantos ja estao na tela. Menor que `total` enquanto o scroll nao acabou. */
  shown?: number;
}

/**
 * Contador de resultados. Fica numa regiao `aria-live` porque a lista muda sem
 * recarregar a pagina — sem isso um leitor de tela nao percebe o filtro agindo,
 * nem que uma fatia nova entrou.
 */
export function ResultCount({ total, shown }: ResultCountProps) {
  const label =
    shown !== undefined && shown < total
      ? `Mostrando ${shown} de ${total} pokemons`
      : total === 1
        ? "1 pokemon encontrado"
        : `${total} pokemons encontrados`;

  return (
    <p aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-400">
      {label}
    </p>
  );
}
