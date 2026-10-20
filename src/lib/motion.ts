import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

/**
 * Whether the reader has asked the system for reduced motion — read at load and followed while the page is open. The
 * prerendered page knows nothing of the reader, so the server's answer is "no"; the stylesheet's own
 * `prefers-reduced-motion` rules already apply from the first paint, and this follows a moment later.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(QUERY).matches,
    () => false,
  );
}
