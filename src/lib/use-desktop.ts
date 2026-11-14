"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";

/** lg and up. The server renders the desktop layout; phones switch after hydration. */
export function useDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
