import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSafeCallbackUrl, CALLBACK_URL_PARAM } from "@/lib/callbackUrl";
import { DEV_GATE_COOKIE, computeGateToken } from "@/lib/devGate";

/**
 * Truly public routes (no auth required)
 */
const PUBLIC_PATHS = [
  "/auth",
  "/auth/forgot-password",
  "/auth/reset-password",

  "/api/auth",
  "/api/ip-country",
  // NOTE: /api/alloptions removed — those public reads are now Server Actions
  // (src/app/actions/options.ts), no longer a proxy route needing an allow-list.
  "/api/contact-us-api",

  "/api/profile-complete",
  "/api/create-profile",
  // Used during step-0 of onboarding before profile_completed flips to true,
  // so it must bypass the "not yet onboarded → redirect to /onboarding" rule.
  "/api/checkphonenumberAvailability",

  "/help-and-support",
  "/contact-us",

  "/privacy-policy",
  "/terms-of-use",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * Account-only PAGES that still require authentication after the switch to
 * "pages are public by default". Everything not listed here is publicly
 * viewable (jobs, companies, events, feed, job/company/event details, other
 * users' profiles, etc.). Per-interaction gating is enforced client-side
 * (useAuthGate) and server-side (requireAuth).
 */
const ACCOUNT_ONLY_PATHS = [
  "/messages",
  "/notifications",
  "/connections",
  "/blocked-users",
];

function isAccountOnlyPath(pathname: string) {
  return ACCOUNT_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function redirectToAuth(req: NextRequest) {
  const url = new URL("/auth", req.url);
  const current = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (isSafeCallbackUrl(current)) {
    url.searchParams.set(CALLBACK_URL_PARAM, current);
  }
  return NextResponse.redirect(url);
}

/**
 * Custom access gate for the dev/staging deployment.
 *
 * Protects the entire site behind a username/password prompt. Instead of the
 * native (unstyleable) HTTP Basic Auth popup, this redirects unauthenticated
 * visitors to the styled `/dev-gate` page, which posts to `/api/dev-gate` and
 * sets a `dev_gate` cookie on success. Here we just verify that cookie.
 *
 * Credentials are read from env vars so they are never hardcoded:
 *
 *   BASIC_AUTH_USER
 *   BASIC_AUTH_PASSWORD
 *
 * Returns a redirect response to block the request, or `null` to let it
 * continue. If either var is unset (e.g. local dev / production), the gate is
 * disabled and requests pass through untouched.
 */
async function devAccessGate(req: NextRequest): Promise<NextResponse | null> {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // Gate disabled when credentials aren't configured.
  if (!user || !password) {
    return null;
  }

  const { pathname } = req.nextUrl;

  // Let the gate UI, its API, and static assets load so the page can render
  // and submit (otherwise the gate would block its own resources). `/api/auth`
  // is allowed too: NextAuth's SessionProvider (mounted by the root layout)
  // fetches `/api/auth/session` on every page — including the gate page — and
  // redirecting that JSON request to the gate's HTML would crash its client.
  if (
    pathname.startsWith("/dev-gate") ||
    pathname.startsWith("/api/dev-gate") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return null;
  }

  const token = req.cookies.get(DEV_GATE_COOKIE)?.value;
  const expected = await computeGateToken(user, password);
  if (token && token === expected) {
    return null;
  }

  // Not authenticated → send to the styled gate, preserving where they were
  // headed (same-origin paths only) so we can return them afterwards.
  const url = new URL("/dev-gate", req.url);
  const current = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (current.startsWith("/") && !current.startsWith("//")) {
    url.searchParams.set(CALLBACK_URL_PARAM, current);
  }
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  // Dev/staging password gate runs first; no-op when env vars are unset.
  const gateResponse = await devAccessGate(req);
  if (gateResponse) {
    return gateResponse;
  }

  const { pathname } = req.nextUrl;

  const access = req.cookies.get("access")?.value;
  const refresh = req.cookies.get("refresh")?.value;
  const otpPending = req.cookies.get("otp_pending")?.value;
  const profileCompleted =
    req.cookies.get("profile_completed")?.value === "true";


  const isAuthenticated = Boolean(access || refresh);


  // allow refresh API itself
  if (pathname.startsWith("/api/auth/refresh")) {
    return NextResponse.next();
  }

  // ----------------------------------
  // Try token refresh if access missing
  // ----------------------------------
  // if (!access && refresh) {
  //   try {
  //     const refreshRes = await fetch(`${req.nextUrl.origin}/api/auth/refresh`, {
  //       method: "POST",
  //       headers: {
  //         Cookie: req.headers.get("cookie") || "",
  //       },
  //     });

  //     if (refreshRes.ok) {
  //       return NextResponse.next();
  //     }
  //   } catch (err) {
  //     console.error("Token refresh failed:", err);
  //   }

  //   const res = NextResponse.redirect(new URL("/auth", req.url));
  //   res.cookies.delete("access");
  //   res.cookies.delete("refresh");
  //   return res;
  // }

  // ----------------------------------
  // Try token refresh if access missing (NEW LOGIC)
  // ----------------------------------
  if (!access && refresh) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const refreshRes = await fetch(`${origin}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: req.headers.get("cookie") || "",
      },
    });

    if (refreshRes.ok) {
      const res = NextResponse.next();

      const setCookie = refreshRes.headers.get("set-cookie");
      if (setCookie) {
        res.headers.set("set-cookie", setCookie);
      }

      return res;
    }

    // Refresh failed → the stale tokens are dead; clear them. Pages are public
    // by default now, so DON'T bounce a visitor to /auth just because a leftover
    // refresh cookie couldn't be refreshed — only account-only pages require it.
    // Otherwise let them continue and view the public page anonymously.
    const res = isAccountOnlyPath(pathname)
      ? redirectToAuth(req)
      : NextResponse.next();
    res.cookies.delete("access");
    res.cookies.delete("refresh");
    return res;
  }



  // ----------------------------------
  // Skip static files
  // ----------------------------------
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ----------------------------------
  // Always allow auth APIs
  // ----------------------------------
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ----------------------------------
  // Public routes
  // ----------------------------------
  if (isPublicPath(pathname)) {
    // Prevent logged-in users from visiting auth pages
    if (isAuthenticated && pathname.startsWith("/auth")) {
      if (pathname === "/auth/verify" && otpPending) {
        return NextResponse.next();
      }
      // Respect the preserved deep-link (e.g. from an email "accept" URL) so
      // an already-logged-in user who visits /auth?callbackUrl=/foo lands
      // back on /foo instead of always bouncing to /home.
      const rawCallback = req.nextUrl.searchParams.get(CALLBACK_URL_PARAM);
      const target = isSafeCallbackUrl(rawCallback) ? rawCallback : "/home";
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  // ----------------------------------
  // Onboarding (auth required, only if NOT completed)
  // ----------------------------------
  if (pathname.startsWith("/onboarding")) {
    if (!isAuthenticated) {
      return redirectToAuth(req);
    }

    if (profileCompleted) {
      return NextResponse.redirect(new URL("/home", req.url));
    }

    return NextResponse.next();
  }

  // ----------------------------------
  // Account-only pages still require authentication
  // (messages, notifications, connections, blocked-users)
  // ----------------------------------
  if (isAccountOnlyPath(pathname)) {
    if (!isAuthenticated) {
      return redirectToAuth(req);
    }
  }

  // ----------------------------------
  // Onboarding gate — preserved for AUTHENTICATED users only.
  // An authenticated user who hasn't finished onboarding is still pushed to
  // /onboarding (unchanged behavior). Anonymous visitors are NOT redirected —
  // all other pages (jobs, companies, events, feed, details, profiles) are
  // now publicly viewable.
  // ----------------------------------
  if (isAuthenticated && !profileCompleted) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Public by default
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
