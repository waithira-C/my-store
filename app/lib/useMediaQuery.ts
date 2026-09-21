"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reactive media query.
 *
 * Deliberately `useSyncExternalStore` rather than useEffect + useState: React
 * uses `getServerSnapshot` during hydration, so the first client render matches
 * SSR exactly (always `false`) and only then re-renders with the real match.
 * A useEffect-based version produces a hydration mismatch under React 19.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
