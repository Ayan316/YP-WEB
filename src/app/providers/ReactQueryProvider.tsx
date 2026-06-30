"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { HAS_SESSION_QUERY_KEY } from "@/app/hooks/useHasSession";

export default function ReactQueryProvider({
  children,
  initialHasSession,
}: {
  children: ReactNode;
  // Server-read cookie-presence signal (access/refresh cookie present). When a
  // boolean, it seeds the `has-session` query so `useHasSession()` resolves
  // synchronously on the FIRST render — server and client agree, so account-only
  // UI (e.g. the navbar Notifications item) paints correctly on a hard refresh
  // instead of waiting for the async /api/auth/has-session round-trip.
  initialHasSession?: boolean;
}) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          gcTime: 5 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
    if (typeof initialHasSession === "boolean") {
      // Seed the cache; useHasSession (staleTime: 0) still re-verifies on mount.
      client.setQueryData(HAS_SESSION_QUERY_KEY, initialHasSession);
    }
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
