import "server-only";

// src/lib/api.ts
//
// The single server-side gateway (D2). Every read (Server Component) and write
// (Server Action) goes through `api.*`. Responsibilities centralised here:
//   - read the httpOnly `access` cookie and attach `Authorization: Bearer`
//   - uniform `{ status, code?, message?, data }` envelope (NFR4)
//   - bounded fetch timeout + retry (NFR3)
//   - inline refresh + cookie rotation on 401 (D5) — never exposes tokens to JS
//   - NEVER logs a token or a body that may contain one (NFR1)
//
// server-only: importing this from a Client Component is a build error.

import { cookies } from "next/headers";
import { setAuthCookies, type CookieStore } from "@/lib/authCookies";

const BASE = process.env.BACKEND_URL!; // server-only; never NEXT_PUBLIC_*

// Backend refresh contract — mirrors src/app/api/auth/refresh/route.ts:
//   POST ${BACKEND}/api/mobile/auth/token/refresh  body { refresh_token }
//   success -> { status, data: { access_token, refresh_token, expires_in? } }
const REFRESH_ENDPOINT = "/api/mobile/auth/token/refresh";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 1;

export type AuthMode = "strict" | "soft" | "none";

export interface ApiResult<T> {
  status: "OK" | "ERROR";
  code?: string;
  message?: string;
  data: T | null;
}

interface Opts {
  auth?: AuthMode;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
  retries?: number;
  cache?: RequestCache;
}

/** Build a `?a=b&c=d` query string, skipping undefined values. */
function qs(query?: Opts["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.append(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * fetch with an AbortController timeout and bounded retry on network errors or
 * 5xx responses. A 4xx (incl. 401) is NOT retried here — 401 handling/refresh is
 * done by the caller so it can rotate cookies first.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retries: number,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) {
        continue; // transient upstream error — retry
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) continue; // network error / abort — retry
      throw err;
    }
  }
  // Unreachable in practice (loop either returns or throws), but satisfies TS.
  throw lastErr ?? new Error("fetchWithTimeout: exhausted retries");
}

/**
 * Refresh the access token using the httpOnly `refresh` cookie and, when cookies
 * are WRITABLE (Server Action / Route Handler), rotate them via setAuthCookies
 * and return the new access token.
 *
 * In a Server Component render the `cookies()` jar is READ-ONLY, so `.set()`
 * throws — we catch and return null; the next navigation's middleware refresh
 * recovers. Returns null on any failure.
 */
async function refreshInline(jar: CookieStore): Promise<string | null> {
  const refreshToken = (jar as unknown as {
    get(name: string): { value: string } | undefined;
  }).get("refresh")?.value;
  if (!refreshToken) return null;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${BASE}${REFRESH_ENDPOINT}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      },
      DEFAULT_TIMEOUT_MS,
      0,
    );
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const payload = (await res.json().catch(() => null)) as {
    data?: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
  } | null;

  const newAccess = payload?.data?.access_token;
  if (!newAccess) return null;

  try {
    // Writable only in an Action/Route — throws during a Server Component render.
    setAuthCookies(jar, {
      access: newAccess,
      refresh: payload?.data?.refresh_token ?? refreshToken,
      expiresIn: payload?.data?.expires_in,
    });
  } catch {
    // Read-only cookie context (render): can't rotate. The new token is still
    // usable for the in-flight retry; middleware refreshes on next navigation.
  }

  return newAccess;
}

async function call<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  opts: Opts = {},
): Promise<ApiResult<T>> {
  const jar = (await cookies()) as unknown as CookieStore;
  let token = (jar as unknown as {
    get(name: string): { value: string } | undefined;
  }).get("access")?.value;

  if (opts.auth === "strict" && !token) {
    // Try an inline refresh first (only succeeds in an Action/Route); if still
    // no token, return UNAUTHENTICATED WITHOUT hitting the network.
    token = (await refreshInline(jar)) ?? undefined;
    if (!token) {
      return {
        status: "ERROR",
        code: "UNAUTHENTICATED",
        message: "Login required",
        data: null,
      };
    }
  }

  const isForm = body instanceof FormData;

  const run = (bearer?: string) =>
    fetchWithTimeout(
      `${BASE}${endpoint}${qs(opts.query)}`,
      {
        method,
        headers: {
          ...(bearer && opts.auth !== "none"
            ? { Authorization: `Bearer ${bearer}` }
            : {}),
          ...(!isForm && body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body: isForm
          ? (body as FormData)
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
        cache: opts.cache ?? "no-store",
      },
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      opts.retries ?? DEFAULT_RETRIES,
    );

  let res: Response;
  try {
    res = await run(token);
  } catch {
    // Network failure / timeout after retries.
    return { status: "ERROR", message: "Network error", data: null };
  }

  // Access expired mid-call -> rotate the httpOnly cookie and retry ONCE.
  if (res.status === 401 && opts.auth !== "none") {
    const fresh = await refreshInline(jar);
    if (fresh) {
      try {
        res = await run(fresh);
      } catch {
        return { status: "ERROR", message: "Network error", data: null };
      }
    }
  }

  // NEVER console.log the token or a body that may contain it.
  const data = (await res.json().catch(() => null)) as
    | (T & { message?: string })
    | { message?: string }
    | null;

  if (res.ok) {
    return { status: "OK", data: (data as T) ?? null };
  }
  return {
    status: "ERROR",
    message: (data as { message?: string } | null)?.message ?? "Upstream error",
    data: null,
  };
}

export const api = {
  get: <T>(e: string, o?: Opts) => call<T>("GET", e, undefined, o),
  post: <T>(e: string, b?: unknown, o?: Opts) => call<T>("POST", e, b, o),
  put: <T>(e: string, b?: unknown, o?: Opts) => call<T>("PUT", e, b, o),
  del: <T>(e: string, b?: unknown, o?: Opts) => call<T>("DELETE", e, b, o),
  postForm: <T>(e: string, f: FormData, o?: Opts) => call<T>("POST", e, f, o),
};
