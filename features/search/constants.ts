/** Constantes de calibracao dos controles de busca e filtro. */

/**
 * Orcamento de caracteres do rotulo do gatilho do filtro de tipo.
 *
 * Contagem de caracteres, e nao medicao de largura: medir exigiria ler layout no
 * cliente e faria o rotulo mudar entre servidor e hidratacao. O numero e
 * calibrado para a largura do controle (`sm:max-w-3xs`) menos o chevron; o
 * `truncate` do span cobre o caso de nome excepcionalmente longo.
 */
export const MAX_LABEL_CHARS = 24;

/** Espera antes de navegar na busca. Curto o bastante para parecer instantaneo. */
export const DEBOUNCE_MS = 300;
