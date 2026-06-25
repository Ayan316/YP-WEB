// // src/app/api/auth/refresh/route.ts
import { NextResponse, NextRequest } from "next/server";
import { setAuthCookiesOnResponse } from "@/lib/authCookies";

const BACKEND = process.env.BACKEND_URL;

/** Options for the long-lived (non-token) profile_completed cookie. */
function cookieOpts(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  };
}

export async function POST(req: NextRequest) {
  try {
    const refresh_token = req.cookies.get("refresh")?.value;

    if (!refresh_token) {
      return NextResponse.json(
        { status: "ERROR", code: "NO_REFRESH_TOKEN", message: "No refresh token" },
        { status: 401 },
      );
    }

    const res = await fetch(`${BACKEND}/api/mobile/auth/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const response = NextResponse.json(data, { status: res.status });
      response.cookies.delete("access");
      response.cookies.delete("refresh");
      return response;
    }

    const newAccess = data?.data?.access_token;
    const newRefresh = data?.data?.refresh_token;

    const response = NextResponse.json({ status: "OK", ...data });

    // ========set profile completed cookie ==================
    // ===== NEW: Fetch profile status =====
    let profileStatus = "0";
    if (newAccess) {
      try {
        const profileRes = await fetch(`${BACKEND}/api/mobile/profile`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${newAccess}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          profileStatus = profileData?.data?.profile_completion_status || "0";
        }
      } catch {
        // Profile status fetch failed, default to "0"
      }
    }
    // ===== END NEW =====

    // Issue access/refresh via the shared helper — maxAge derived from the REAL
    // token TTL (fixes the prior access=60s / refresh=24h refresh-storm +
    // premature-logout bug). When the backend returns no new refresh token we
    // re-issue the existing one so the refresh window is preserved.
    if (newAccess) {
      setAuthCookiesOnResponse(response, {
        access: newAccess,
        refresh: newRefresh ?? refresh_token,
        expiresIn: data?.data?.expires_in,
        refreshExpiresIn: data?.data?.refresh_expires_in,
      });
    }

    if (profileStatus === "1") {
      response.cookies.set(
        "profile_completed",
        "true",
        cookieOpts(1000 * 60 * 60 * 24 * 365 * 80),
      );
    } else {
      response.cookies.set(
        "profile_completed",
        "false",
        cookieOpts(1000 * 60 * 60 * 24 * 365 * 80),
      );
    }
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", message: err?.message ?? "Proxy error" },
      { status: 500 },
    );
  }
}
