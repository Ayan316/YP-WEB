// src/app/api/auth/social-login/route.ts

import { NextResponse } from "next/server";
import { setAuthCookiesOnResponse } from "@/lib/authCookies";

const BACKEND = process.env.BACKEND_URL;

export async function POST(req: Request) {
  try {
    const body = await req.json();


    const res = await fetch(`${BACKEND}/api/mobile/social-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // data.access and data.refresh expected as in your example
    const accessToken: string | undefined = data?.access;
    const refreshToken: string | undefined = data?.refresh;

    const nextRes = NextResponse.json(data, { status: res.status });

    // Issue access/refresh via the shared helper — maxAge derived from the real
    // token TTL (expires_in / JWT exp) instead of a session cookie, secure-in-prod.
    if (accessToken) {
      setAuthCookiesOnResponse(nextRes, {
        access: accessToken,
        refresh: refreshToken,
        expiresIn: data?.expires_in,
        refreshExpiresIn: data?.refresh_expires_in,
      });
    }

    return nextRes;
    
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", message: err?.message || "Proxy error" },
      { status: 500 }
    );
  }
}