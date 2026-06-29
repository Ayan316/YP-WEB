// src/app/api/auth/me/route.ts
import { NextResponse, NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL;

async function callBackendMe(access?: string, cookieHeader?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (access) headers["Authorization"] = `Bearer ${access}`;
  if (!access && cookieHeader) headers["cookie"] = cookieHeader;

  const res = await fetch(`${BACKEND}/api/mobile/token/refresh`, {
    method: "GET",
    headers,
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function GET(req: NextRequest) {
  try {
    // `req.cookies` is available on NextRequest and typed correctly
    const cookieHeader = req.headers.get("cookie") ?? "";
    const access = req.cookies.get("access")?.value;

    // Try with access token header first
    if (access) {
      const { res, data } = await callBackendMe(access, cookieHeader);
      if (res.ok) return NextResponse.json({ user: data?.user ?? data?.data ?? data });
      if (res.status !== 401) return NextResponse.json({ error: data }, { status: res.status });
      // if 401 -> attempt refresh flow
    }

    // Attempt refresh via our refresh route (which uses cookie).
    // Derive the origin from the incoming request so the URL is always valid
    // (NEXT_PUBLIC_APP_URL could be unset → previously produced "/api/auth/refresh").
    // Note: we forward cookies via the cookie header so backend can see them.
    const origin = new URL(req.url).origin;
    const refreshResp = await fetch(`${origin}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: cookieHeader, "Content-Type": "application/json" },
    });

    if (!refreshResp.ok) return NextResponse.json({ user: null }, { status: 401 });

    // After refresh, try to call backend/me again using cookie header
    const { res, data } = await callBackendMe(undefined, cookieHeader);
    if (res.ok) return NextResponse.json({ user: data?.user ?? data?.data ?? data });

    return NextResponse.json({ user: null }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ status: "ERROR", message: err?.message ?? "Proxy error" }, { status: 500 });
  }
}
