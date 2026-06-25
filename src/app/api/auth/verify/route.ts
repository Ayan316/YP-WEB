import { NextResponse } from "next/server";
import { setAuthCookiesOnResponse } from "@/lib/authCookies";

const BACKEND = process.env.BACKEND_URL;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify OTP request

    const backendResponse = await fetch(
      `${BACKEND}/api/mobile/auth/verify-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    let data;
    try {
      data = await backendResponse.json();
    } catch {
      data = { status: "FAILED", message: "Invalid JSON from backend" };
    }


    // Explicit failure case logging
    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          status: "FAILED",
          message: data?.message || "Backend verification failed",
          backendStatus: backendResponse.status,
          backendError: data,
        },
        { status: backendResponse.status }
      );
    }

    const nextRes = NextResponse.json(data, {
      status: backendResponse.status,
    });

    // Clear OTP pending cookie
    nextRes.cookies.delete("otp_pending");

    // Issue access/refresh via the shared helper — maxAge derived from the real
    // token TTL (expires_in / JWT exp), secure-in-prod, httpOnly.
    if (data?.data?.access_token) {
      setAuthCookiesOnResponse(nextRes, {
        access: data.data.access_token,
        refresh: data.data.refresh_token,
        expiresIn: data?.data?.expires_in,
        refreshExpiresIn: data?.data?.refresh_expires_in,
      });
    }

    const profile_status = data?.data?.user?.profile_completion_status;

    if (profile_status === '1'){
      nextRes.cookies.set("profile_completed", "true", {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
      });
    } else {
      nextRes.cookies.delete("profile_completed");
    }

    return nextRes;
  } catch (err: any) {
    console.error("Server Error:", err);
    return NextResponse.json(
      {
        status: "ERROR",
        message: err?.message || "Internal Proxy Error",
      },
      { status: 500 }
    );
  }
}
