import { useSyncExternalStore } from 'react';
import { readCanvasTheme, type CanvasTheme } from './canvas';

let media: MediaQueryList | undefined;
let snapshot: { dark: boolean; theme: CanvasTheme } | undefined;
const listeners = new Set<() => void>();

function systemScheme() {
  return (media ??= window.matchMedia('(prefers-color-scheme: dark)'));
}

function notify() {
  snapshot = undefined;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  if (!listeners.size) systemScheme().addEventListener('change', notify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) systemScheme().removeEventListener('change', notify);
  };
}

function getSnapshot() {
  const dark = systemScheme().matches;
  if (!snapshot || snapshot.dark !== dark) snapshot = { dark, theme: readCanvasTheme() };
  return snapshot.theme;
}

/** Share one system listener and one CSS-token read per scheme across canvas consumers. */
export function useCanvasTheme() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
