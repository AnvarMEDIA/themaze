declare module 'tinykeys' {
  export type KeyBindingHandler = (event: KeyboardEvent) => void
  export type KeyBindingMap = Record<string, KeyBindingHandler>
  export interface KeyBindingOptions {
    event?: 'keydown' | 'keyup'
    capture?: boolean
  }
  export function tinykeys(
    target: Window | HTMLElement,
    bindings: KeyBindingMap,
    options?: KeyBindingOptions,
  ): () => void
}
