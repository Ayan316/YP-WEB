import { useSyncExternalStore } from "react";

// Hydration-safe "are we on the client yet?" signal. Returns `false` during SSR
// AND during the first client (hydration) render, then `true` after hydration.
// Use it to gate UI that depends on client-only data (auth/session, theme,
// localStorage, window) so the server output and the first client render agree
// — preventing hydration mismatches — without a setState-in-effect.
const emptySubscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
