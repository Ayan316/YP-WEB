import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL!;

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));

    // Validate required fields
    const { first_name, last_name, email, phone_no, message } = payload;
    if (!first_name || !last_name || !email || !phone_no || !message) {
      return NextResponse.json(
        { status: "ERROR", message: "All fields are required" },
        { status: 400 }
      );
    }

    const backendRes = await fetch(
      `${BACKEND_URL}/api/web/user/contact-us`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );

    const data = await backendRes.json().catch(() => ({}));

    // Handle backend error
    if (!backendRes.ok) {
      return NextResponse.json(
        {
          status: "ERROR",
          message: data?.message || "Failed to submit contact form",
        },
        { status: backendRes.status }
      );
    }

    // Success response
    return NextResponse.json(
      {
        status: "OK",
        data,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Contact us proxy error:", err);

    return NextResponse.json(
      {
        status: "ERROR",
        message: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}