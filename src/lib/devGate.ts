// Shared helpers for the dev/staging access gate.
//
// This replaces the native HTTP Basic Auth popup (which browsers render and
// cannot be styled) with a custom in-app modal. The proxy (middleware) checks
// a cookie instead of returning a 401; the cookie holds a hash of the
// configured credentials so the raw password is never stored in the browser.
//
// Both the Edge proxy and the Node API route import from here, so everything
// in this file must be runtime-agnostic (Web Crypto only, no Node APIs).

export const DEV_GATE_COOKIE = "dev_gate";

// 7 days — long enough to avoid re-prompting during a work session.
export const DEV_GATE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Deterministic token derived from the configured credentials. The proxy
 * compares the cookie against this value; the API route writes it on a
 * successful login. SHA-256 keeps the actual password out of the cookie.
 */
export async function computeGateToken(
  user: string,
  password: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${user}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
