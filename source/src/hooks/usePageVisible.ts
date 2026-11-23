import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** Stops background scene work while preserving the multiplayer connection. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, () => !document.hidden, () => true);
}
