import { useSyncExternalStore } from 'react';

const subscribe = (): (() => void) => () => undefined;

/**
 * Whether the panel has hydrated: false in a server render and in the pass that adopts it, true from then on.
 * The panel renders in the browser alone, so it reads true at once; a field it gates stays off until React
 * owns it, because a keystroke that lands before then never reaches the form's state.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
