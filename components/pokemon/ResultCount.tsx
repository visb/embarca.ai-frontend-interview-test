interface ResultCountProps {
  total: number;
}

/**
 * Contador de resultados. Fica numa regiao `aria-live` porque a lista muda sem
 * recarregar a pagina — sem isso um leitor de tela nao percebe o filtro agindo.
 */
export function ResultCount({ total }: ResultCountProps) {
  return (
    <p aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-400">
      {total === 1 ? "1 pokemon encontrado" : `${total} pokemons encontrados`}
    </p>
  );
}
