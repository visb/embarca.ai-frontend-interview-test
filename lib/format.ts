/** Formatacoes de exibicao compartilhadas pela listagem e pelo detalhe. */

/** `25` -> `#0025`. Numero da pokedex com o mesmo largura em todos os cards. */
export function formatPokedexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** `mr-mime` -> `Mr Mime`. Nomes da PokeAPI vem em minusculas e com hifen. */
export function formatPokemonName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
