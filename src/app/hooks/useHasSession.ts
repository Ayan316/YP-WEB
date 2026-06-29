import { useQuery } from "@tanstack/react-query";

export const HAS_SESSION_QUERY_KEY = ["has-session"];

/**
 * Cookie-presence auth signal. Hits GET /api/auth/has-session (which always
 * returns 200) so it never triggers the axios refresh/force-logout interceptor.
 * Used by useAuthGate to cover email/password users that `useSession()` misses.
 */
async function fetchHasSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/has-session", {
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return Boolean(data?.authenticated);
  } catch {
    return false;
  }
}

export function useHasSession() {
  return useQuery({
    queryKey: HAS_SESSION_QUERY_KEY,
    queryFn: fetchHasSession,
    // Always re-check on mount so the signal flips to `true` immediately after
    // a client-side login navigation (and to `false` right after logout) — it's
    // a cheap public endpoint and concurrent consumers dedupe to one request.
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
