// Lightweight cookie-presence check used by the client auth gate.
//
// `useSession()` (next-auth) is only populated by the SOCIAL login path; users
// who logged in via email/password have valid httpOnly `access`/`refresh`
// cookies but no next-auth session. This endpoint reads those httpOnly cookies
// server-side (the browser cannot) and reports whether a session exists, so the
// gate doesn't falsely prompt cookie-authenticated users to log in.
//
// Always returns HTTP 200 (never 401) so it never participates in token refresh.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const store = await cookies();
  const authenticated = Boolean(
    store.get("access")?.value || store.get("refresh")?.value,
  );
  return NextResponse.json({ authenticated });
}
