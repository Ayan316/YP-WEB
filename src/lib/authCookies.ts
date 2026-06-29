// src/lib/authCookies.ts
//
// Single source of truth for issuing/clearing the httpOnly auth cookies.
// Replaces the 5 inconsistent issuers (src/auth.ts, auth/login, auth/verify,
// auth/refresh, auth/social-login) whose maxAge ranged over {session, 60s, 24h,
// 7d} — see API_AND_AUTH_REVIEW Part A.4 / migration-map cookieIssuers[].
//
// Decision D7: cookie maxAge is derived from the REAL token TTL — preferring a
// backend-provided `expires_in` (seconds), else the JWT `exp` claim — instead of
// a hardcoded lifetime.
//
// `store` is any cookie store exposing `.set()` / `.delete()`. Both the awaited
// `cookies()` jar from `next/headers` (ReadonlyRequestCookies) and a
// `NextResponse`'s `.cookies` (ResponseCookies) share the same set/delete
// signatures (ReadonlyRequestCookies picks them straight from ResponseCookies),
// so a single structural type works for both call sites.

/** Cookie names — must match the existing app (see auth/login, auth/refresh, auth/verify). */
export const ACCESS_COOKIE = "access" as const;
export const REFRESH_COOKIE = "refresh" as const;
export const PROFILE_COMPLETED_COOKIE = "profile_completed" as const;

/** ~80 years, matching the existing long-lived profile_completed cookie. */
const PROFILE_COMPLETED_MAX_AGE = 1000 * 60 * 60 * 24 * 365 * 80;

/** Fallback access-cookie maxAge (seconds) when no TTL can be derived. */
const DEFAULT_ACCESS_MAX_AGE = 60 * 60; // 1h
/** Fallback refresh-cookie maxAge (seconds) when no TTL can be derived. */
const DEFAULT_REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7d

type SameSite = boolean | "lax" | "strict" | "none";

interface CookieAttributes {
  httpOnly?: boolean;
  sameSite?: SameSite;
  secure?: boolean;
  path?: string;
  maxAge?: number;
}

/**
 * Minimal structural cookie store. Satisfied by both the `cookies()` jar and a
 * `NextResponse`'s `.cookies` (both expose these exact overloads).
 */
export interface CookieStore {
  set(name: string, value: string, options?: CookieAttributes): unknown;
  delete(name: string): unknown;
}

interface SetAuthCookiesArgs {
  access: string;
  refresh?: string;
  /** Backend-reported access token lifetime in seconds (preferred TTL source). */
  expiresIn?: number;
  /** Backend-reported refresh token lifetime in seconds, if provided. */
  refreshExpiresIn?: number;
  /** When provided, also writes the long-lived profile_completed cookie. */
  profileCompleted?: boolean;
}

/** Base options shared by every auth cookie. */
function baseOptions(): Omit<CookieAttributes, "maxAge"> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

/**
 * Decode a JWT's `exp` (seconds since epoch) without any dependency.
 * Manual base64url decode of the payload segment. Returns null when the token is
 * not a well-formed JWT or has no numeric `exp`.
 */
export function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64url -> base64
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return null;

    const json =
      typeof atob === "function"
        ? atob(b64)
        : Buffer.from(b64, "base64").toString("binary");

    const claims = JSON.parse(json) as { exp?: unknown };
    return typeof claims.exp === "number" && Number.isFinite(claims.exp)
      ? claims.exp
      : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a cookie maxAge (seconds) for a token: prefer an explicit
 * backend-provided `expires_in`, else derive `exp - now` from the JWT, else the
 * supplied fallback. Always returns a positive integer.
 */
function resolveMaxAge(
  token: string,
  explicitExpiresIn: number | undefined,
  fallback: number,
): number {
  if (
    typeof explicitExpiresIn === "number" &&
    Number.isFinite(explicitExpiresIn) &&
    explicitExpiresIn > 0
  ) {
    return Math.floor(explicitExpiresIn);
  }
  const exp = decodeJwtExp(token);
  if (exp !== null) {
    const seconds = exp - Math.floor(Date.now() / 1000);
    if (seconds > 0) return seconds;
  }
  return fallback;
}

/**
 * Write the `access` (+ optional `refresh`, + optional `profile_completed`)
 * cookies on the given store with TTLs derived from the real token lifetime.
 *
 * Works with both the awaited `cookies()` jar (Server Action / Route Handler)
 * and a `NextResponse`'s `.cookies`.
 *
 * NOTE: in a Server Component render the `cookies()` jar is read-only and
 * `.set()` throws — callers that may run during render must guard / catch.
 */
export function setAuthCookies(store: CookieStore, args: SetAuthCookiesArgs): void {
  const { access, refresh, expiresIn, refreshExpiresIn, profileCompleted } = args;
  const opts = baseOptions();

  store.set(ACCESS_COOKIE, access, {
    ...opts,
    maxAge: resolveMaxAge(access, expiresIn, DEFAULT_ACCESS_MAX_AGE),
  });

  if (refresh) {
    store.set(REFRESH_COOKIE, refresh, {
      ...opts,
      maxAge: resolveMaxAge(refresh, refreshExpiresIn, DEFAULT_REFRESH_MAX_AGE),
    });
  }

  if (typeof profileCompleted === "boolean") {
    store.set(PROFILE_COMPLETED_COOKIE, profileCompleted ? "true" : "false", {
      ...opts,
      maxAge: PROFILE_COMPLETED_MAX_AGE,
    });
  }
}

/**
 * Alias for setting auth cookies directly on a `NextResponse` (its `.cookies`
 * is structurally a `CookieStore`). Returns the same response for chaining.
 */
export function setAuthCookiesOnResponse<R extends { cookies: CookieStore }>(
  response: R,
  args: SetAuthCookiesArgs,
): R {
  setAuthCookies(response.cookies, args);
  return response;
}

/** Remove the access + refresh cookies (used on logout / hard refresh failure). */
export function clearAuthCookies(store: CookieStore): void {
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
