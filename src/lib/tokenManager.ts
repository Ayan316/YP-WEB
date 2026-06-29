// src/lib/tokenManager.ts
import { signOut } from "next-auth/react";
import { authUrlWithCallback } from "@/lib/callbackUrl";
import { isAccountOnlyPath } from "@/lib/publicRoutes";

/* ------------------------------------------------------------------
   Same force-logout as axios.ts
------------------------------------------------------------------- */
const forceLogout = async () => {
  if (typeof window === "undefined") return;

  console.warn("🔐 Both tokens invalid — clearing session");

  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch (e) {
    console.error("Logout API error:", e);
  }

  try {
    await signOut({ redirect: false });
  } catch (e) {
    console.error("NextAuth signOut error:", e);
  }

  // Only bounce to /auth from pages that REQUIRE login. On public pages let the
  // visitor stay and keep browsing anonymously — never redirect off a public page.
  if (isAccountOnlyPath(window.location.pathname)) {
    window.location.replace(authUrlWithCallback("/auth"));
  }
};

/* ------------------------------------------------------------------
   Ensures a valid access token exists.
   If access token invalid → try refresh.
   If refresh also fails → force logout immediately.
------------------------------------------------------------------- */
export const ensureValidToken = async (): Promise<void> => {
  // Fast path for logged-out visitors: a cheap always-200 presence check so we
  // skip the /api/auth/me + /api/auth/refresh round-trip (and the 401 noise)
  // entirely on public pages. Only proceed to the full check when a session
  // cookie actually exists.
  try {
    const sess = await fetch("/api/auth/has-session", { credentials: "include" });
    if (sess.ok) {
      const data = await sess.json().catch(() => null);
      if (data && data.authenticated === false) return;
    }
  } catch {
    /* network hiccup — fall through to the full validation below */
  }

  const response = await fetch("/api/auth/me", { credentials: "include" });

  if (response.status === 401) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!refreshResponse.ok) {
      // Distinguish an ANONYMOUS visitor (no refresh token at all) from a
      // genuinely EXPIRED session. Anonymous is NOT a logout situation: return
      // quietly and let the caller's request proceed — public endpoints return
      // data; gated endpoints return 401 UNAUTHENTICATED (handled by the axios
      // interceptor). This keeps logged-out users browsing public pages without
      // being force-logged-out.
      let code = "";
      try {
        const body = await refreshResponse.clone().json();
        code = body?.code || "";
      } catch {
        /* non-JSON body — fall through to logout */
      }
      if (code === "NO_REFRESH_TOKEN") {
        return;
      }

      // A refresh token existed but the backend rejected it → real expiry.
      console.error("❌ Refresh token invalid — clearing session");
      await forceLogout();
      throw new Error("Session expired. Please log in again.");
    }
  }
};

/* ------------------------------------------------------------------
   Returns true if authenticated, false if both tokens are dead
------------------------------------------------------------------- */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await ensureValidToken();
    return true;
  } catch {
    return false;
  }
};