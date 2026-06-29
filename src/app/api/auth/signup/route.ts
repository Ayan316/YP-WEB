// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.email) {
      return NextResponse.json(
        { status: "ERROR", message: "Email is required" },
        { status: 400 }
      );
    }

    // Call your backend signup endpoint
    const backendRes = await fetch(`${BACKEND}/api/mobile/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.email,
        full_name: body.full_name || body.name || "User",
      }),
    });

    const data = await backendRes.json();

    // Check if user already exists
    const alreadyExists =
      backendRes.status === 409 ||
      data?.status === "ALREADY_EXISTS" ||
      /already\s*exists/i.test(String(data?.message ?? ""));

    if (alreadyExists) {
      return NextResponse.json(
        {
          status: "ALREADY_EXISTS",
          message: "An account with this email already exists. Please login.",
        },
        { status: 409 }
      );
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            data?.message || `Signup failed with status ${backendRes.status}`,
        },
        { status: backendRes.status }
      );
    }

    // Success
    // return NextResponse.json(
    //   {
    //     status: "SUCCESS",
    //     message: "Account created successfully",
    //     user: data?.user
    //   },
    //   { status: 201 }
    // );

    // SUCCESS — OTP has been sent
    const res = NextResponse.json(
      {
        status: "SUCCESS",
        message: "Account created successfully. OTP sent.",
        user: data?.user,
      },
      { status: 201 }
    );

    // OTP STATE COOKIE (controls access to /auth/verify)
    res.cookies.set("otp_pending", "true", {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 10 * 60,
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err: any) {
    console.error("signup proxy error:", err);
    return NextResponse.json(
      { status: "ERROR", message: err?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
