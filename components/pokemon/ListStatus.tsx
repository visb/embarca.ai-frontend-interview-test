import { PokemonGridSkeleton } from "@/components/pokemon/PokemonGridSkeleton";
import { PendingIndicator } from "@/components/ui/PendingIndicator";

interface ListStatusProps {
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
}

const BUTTON_CLASSES =
  "inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100";

/**
 * Base da listagem: o que carrega, o que falhou e onde a lista acaba.
 *
 * Os tres estados sao explicitos de proposito. Scroll infinito sem fim visivel
 * deixa o usuario rolando a espera de conteudo que nao existe, e uma falha
 * silenciosa parece exatamente igual ao fim da lista.
 */
export function ListStatus({ loading, error, hasMore, total, onLoadMore }: ListStatusProps) {
  if (total === 0) return null;

  if (error) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nao foi possivel carregar mais pokemons.
        </p>
        {/* Os cards ja carregados continuam na tela: so a fatia que faltou e refeita. */}
        <button type="button" onClick={onLoadMore} className={BUTTON_CLASSES}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {total === 1 ? "1 pokemon no total" : `${total} de ${total} pokemons`}
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-6">
      {/* Reserva a altura da proxima fatia: sem isso a lista "pula" ao anexar. */}
      {loading ? <PokemonGridSkeleton count={4} /> : null}

      {/*
        Sem `disabled`: desabilitar o botao que acabou de ser clicado tira o
        foco do teclado. O clique repetido e barrado dentro do `InfiniteList`.
      */}
      <button type="button" onClick={onLoadMore} className={BUTTON_CLASSES}>
        Carregar mais
        <PendingIndicator pending={loading} />
      </button>
    </div>
  );
}
