// Shared server-side auth guard for interaction API routes.
//
// "Pages public, interactions gated": browse/detail routes stay open (soft-attach
// the token when present), but write/account routes must reject anonymous callers
// with a consistent 401 the client can detect.
//
// The `code: "UNAUTHENTICATED"` discriminator lets the browser axios interceptor
// tell "never logged in" (let the client gate prompt a login — do NOT refresh or
// force-logout) apart from "token expired" (refresh normally). See src/lib/axios.ts.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const UNAUTHENTICATED = {
  status: "ERROR" as const,
  code: "UNAUTHENTICATED" as const,
  message: "You must be logged in to perform this action.",
};

/**
 * Returns the access token string when present, otherwise a ready-to-return
 * 401 NextResponse with the standard UNAUTHENTICATED contract.
 *
 * Usage in a route handler:
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   const accessToken = auth; // forward as `Bearer ${accessToken}`
 */
export async function requireAuth(): Promise<string | NextResponse> {
  const accessToken = (await cookies()).get("access")?.value;
  if (!accessToken) {
    return NextResponse.json(UNAUTHENTICATED, { status: 401 });
  }
  return accessToken;
}

/**
 * Soft accessor for the access token.
 *
 * Returns the "access" cookie value when present, otherwise `undefined`. Never
 * throws and never redirects — use this for soft/none-auth call sites that
 * attach the token only when the caller happens to be logged in (the gateway in
 * src/lib/api.ts handles strict gating + refresh).
 */
export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get("access")?.value;
}
