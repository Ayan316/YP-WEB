// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { setAuthCookiesOnResponse } from "@/lib/authCookies";

const BACKEND = process.env.BACKEND_URL;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = body.email?.trim();
    const phone = body.phone?.trim();

    // Determine identifier
    const identifier = email ? "email" : phone ? "phone" : null;

    if (!identifier) {
      return NextResponse.json(
        { status: "FAILED", message: "Email or Phone is required" },
        { status: 400 }
      );
    }

    // Build login payload correctly
    const payload = {
      login_type: "system",
      identifier,
      value: identifier === "email" ? email : phone,
      password: body.password,
    };

    // console.log("Login payload:", payload);

    const backendRes = await fetch(`${BACKEND}/api/mobile/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await backendRes.json();

    // console.log("Login API response:", data);

    // Propagate status and body
    // return new NextResponse(JSON.stringify(data), {
    //   status: backendRes.status,
    //   headers: { "Content-Type": "application/json" },
    // });

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    // Suspended users — return 403 with a clear signal for the Login component
    if (data?.data?.user?.is_suspended === true) {
      return NextResponse.json(
        { status: "SUSPENDED", message: "Your account has been suspended. Please contact support@youngprofessionals.global." },
        { status: 403 }
      );
    }

    // Auto-accept terms on login if user hasn't accepted yet
    const accessToken = data?.data?.access_token;
    if (accessToken && data?.data?.user?.terms_accepted === false) {
      try {
        await fetch(`${BACKEND}/api/mobile/user/accept-terms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ terms_version: "1.0", accepted: true }),
        });
        // Reflect the acceptance in the response so the client knows
        if (data?.data?.user) {
          data.data.user.terms_accepted = true;
        }
      } catch {
        // non-fatal — login still succeeds
      }
    }

    const res = NextResponse.json(data, { status: backendRes.status });

    const isProfileCompleted = data?.data?.user?.profile_completion_status;

    if (isProfileCompleted === '1'){
      res.cookies.set("profile_completed", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 365 * 80,
      });
    }

    // Issue access/refresh via the shared helper — maxAge derived from the real
    // token TTL (expires_in / JWT exp), secure-in-prod, httpOnly.
    if (data?.data?.access_token) {
      setAuthCookiesOnResponse(res, {
        access: data.data.access_token,
        refresh: data.data.refresh_token,
        expiresIn: data?.data?.expires_in,
        refreshExpiresIn: data?.data?.refresh_expires_in,
      });
    }

    // Store theme_settings in a client-readable cookie for theme sync
    const themeSetting = data?.data?.user?.theme_setting ?? data?.data?.user?.theme_settings;
    if (themeSetting !== undefined && themeSetting !== null) {
      res.cookies.set("theme_settings", String(themeSetting), {
        httpOnly: false,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 24 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
    }

    if (data?.data?.user?.is_2fa_enabled) {
      res.cookies.set("otp_pending", "true", {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 10 * 60,
        secure: process.env.NODE_ENV === "production",
      });
    }

    //MARK OTP AS PENDING
    // res.cookies.set("otp_pending", "true", {
    //   httpOnly: true,
    //   sameSite: "lax" as const,
    //   path: "/",
    //   maxAge: 10 * 60,
    //   secure: process.env.NODE_ENV === "production",
    // });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", message: err?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
