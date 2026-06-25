import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEV_GATE_COOKIE,
  DEV_GATE_MAX_AGE,
  computeGateToken,
} from "@/lib/devGate";

/**
 * Validates the dev-gate credentials and, on success, sets the httpOnly cookie
 * the proxy looks for. Credentials come from the same env vars the old Basic
 * Auth gate used — nothing is hardcoded.
 */
export async function POST(req: Request) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  // Gate disabled (no creds configured) — treat as open.
  if (!expectedUser || !expectedPassword) {
    return NextResponse.json({ ok: true });
  }

  const { username, password } = await req
    .json()
    .catch(() => ({ username: "", password: "" }));

  if (username !== expectedUser || password !== expectedPassword) {
    return NextResponse.json(
      { ok: false, error: "Incorrect username or password" },
      { status: 401 },
    );
  }

  const token = await computeGateToken(expectedUser, expectedPassword);
  const cookieStore = await cookies();
  cookieStore.set(DEV_GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DEV_GATE_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
