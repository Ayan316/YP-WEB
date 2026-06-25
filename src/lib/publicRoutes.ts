// Routes that must be reachable without an authenticated session. Any API
// interceptor that would otherwise force-log-out an unauthenticated user
// should treat these paths as exempt.
export const PUBLIC_ROUTES = ["/privacy-policy", "/terms-of-use"] as const;

export function isPublicRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// Account-only PAGES that require authentication (mirror of ACCOUNT_ONLY_PATHS
// in src/proxy.ts). Everything else is public/browseable. Client-side
// force-logout helpers use this so they only bounce a user to /auth from a page
// that actually requires login — never off a public page.
export const ACCOUNT_ONLY_ROUTES = [
  "/messages",
  "/notifications",
  "/connections",
  "/blocked-users",
] as const;

export function isAccountOnlyPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ACCOUNT_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
