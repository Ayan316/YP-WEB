// Helpers for preserving the URL a user was trying to reach when they were
// bounced to /auth. Used by the email "accept connection" flow so a user who
// opens the link while logged out lands back on the same URL after login.

import { isPublicRoute } from "@/lib/publicRoutes";

const PARAM = "callbackUrl";

const AUTH_PREFIXES = ["/auth"] as const;

function isAuthPath(pathname: string): boolean {
  return AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * A callbackUrl is safe if it is a same-origin absolute path (starts with "/"
 * but not "//"), is not the auth flow itself, and is not a public landing
 * page that the user would not have been trying to complete a task on.
 */
export function isSafeCallbackUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  const pathname = value.split("?")[0].split("#")[0];
  if (isAuthPath(pathname)) return false;
  if (isPublicRoute(pathname)) return false;
  return true;
}

/**
 * Returns the current URL's path+search formatted for the callbackUrl param,
 * or null when the current location is not worth preserving (auth pages,
 * public marketing pages, etc.).
 */
export function buildCallbackFromCurrentLocation(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname, search, hash } = window.location;
  const candidate = `${pathname}${search}${hash}`;
  return isSafeCallbackUrl(candidate) ? candidate : null;
}

/**
 * Appends ?callbackUrl=<current-location> to `/auth` when the current URL is
 * worth preserving. Used by force-logout redirects so that a logged-out user
 * who opened a deep link (e.g. an email "Accept" URL) comes back to it after
 * signing in.
 */
export function authUrlWithCallback(base = "/auth"): string {
  const callback = buildCallbackFromCurrentLocation();
  if (!callback) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${PARAM}=${encodeURIComponent(callback)}`;
}

/**
 * Reads and validates the callbackUrl from a URLSearchParams / query-string.
 * Returns the decoded path if safe, otherwise null.
 */
export function readCallbackUrl(
  source: URLSearchParams | string | null | undefined,
): string | null {
  if (!source) return null;
  const params =
    typeof source === "string"
      ? new URLSearchParams(source.startsWith("?") ? source.slice(1) : source)
      : source;
  const raw = params.get(PARAM);
  return isSafeCallbackUrl(raw) ? raw : null;
}

/**
 * Merges a callbackUrl into an existing URLSearchParams instance when it is
 * safe. Useful when forwarding the value through multi-step auth flows
 * (login → verify OTP → final destination).
 */
export function appendCallbackUrl(
  params: URLSearchParams,
  callbackUrl: string | null | undefined,
): void {
  if (isSafeCallbackUrl(callbackUrl)) {
    params.set(PARAM, callbackUrl);
  }
}

export const CALLBACK_URL_PARAM = PARAM;
