// src/app/providers/Providers.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import ReactQueryProvider from "./ReactQueryProvider";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { isPublicRoute } from "@/lib/publicRoutes";
import type { Session } from "next-auth";

/** Syncs theme_settings from the user profile API to ThemeContext on first load */
function ThemeSync() {
  const pathname = usePathname();
  // Skip the profile fetch on publicly accessible pages; otherwise an
  // unauthenticated visitor would trigger a 401 → force-logout redirect.
  if (isPublicRoute(pathname)) {
    return null;
  }
  return <ThemeSyncInner />;
}

function ThemeSyncInner() {
  const { syncThemeFromApi } = useTheme();
  const { data: userProfile } = useUserProfile();
  const hasSynced = useRef(false);

  useEffect(() => {
    const themeSetting = userProfile?.data?.theme_setting ?? userProfile?.data?.theme_settings;
    if (themeSetting !== undefined && themeSetting !== null && !hasSynced.current) {
      hasSynced.current = true;
      syncThemeFromApi(String(themeSetting));
    }
  }, [userProfile, syncThemeFromApi]);

  return null;
}

export default function Providers({
  children,
  session,
  initialHasSession,
}: {
  children: React.ReactNode;
  session?: Session | null;
  // Server-read cookie-presence signal, forwarded to ReactQueryProvider so the
  // `has-session` query is seeded on first render (see ReactQueryProvider).
  initialHasSession?: boolean;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <ThemeProvider>
      <ReactQueryProvider initialHasSession={initialHasSession}>
        <SessionBoundary session={session}>
          <AuthProvider>
            <ThemeSync />
            {children}
          </AuthProvider>
        </SessionBoundary>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}

/**
 * Wraps children in a SessionProvider for protected routes. On public routes
 * (privacy policy, terms of use) we skip SessionProvider entirely so an
 * unauthenticated visitor never triggers the /api/auth/session fetch — which
 * returns an HTML error page in some dev environments and surfaces as a
 * ClientFetchError in the console.
 */
function SessionBoundary({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  const pathname = usePathname();
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
