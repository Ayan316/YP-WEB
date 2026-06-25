// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL || ""; // e.g. "http://localhost:8000"

function isValidEmail(email?: string) {
  if (!email) return false;
  // simple RFC-ish email check (good for basic validation)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone?: string) {
  if (!phone) return false;
  // permissive phone validation: allow +, digits, spaces, hyphens, parentheses
  // For stronger validation use libphonenumber on server or delegate to backend
  return /^[\d\+\-\s\(\)]+$/.test(phone);
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = (body?.email || "").toString().trim();
    const phone = (body?.phone || "").toString().trim();
    const full_name = (body?.full_name || body?.name || "User").toString().trim();
    const password = (body?.password || "").toString().trim();
    const first_name = (body?.first_name || "").toString().trim();
    const last_name = (body?.last_name || "").toString().trim();

    const signup_type = "system";

    // Require at least one of email or phone
    if (!email && !phone && !password) {
      return NextResponse.json(
        { status: "ERROR", message: "Either email or phone is required." },
        { status: 400 }
      );
    }

    // Validate provided fields
    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { status: "ERROR", message: "Invalid email format." },
        { status: 400 }
      );
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { status: "ERROR", message: "Invalid phone format." },
        { status: 400 }
      );
    }

    // Build backend payload: include whichever fields available
    const payload: Record<string, any> = {
      full_name,
    };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;
    if (password) payload.password = password;
    if (first_name) payload.first_name = first_name;
    if (last_name) payload.last_name = last_name;
    payload.signup_type = signup_type;

    console.log("signup payload:", payload);

    // Forward to backend signup endpoint
    const backendRes = await fetch(`${BACKEND}/api/mobile/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Try to parse backend response safely
    let data: any = null;
    try {
      data = await backendRes.json();
    } catch (e) {
      // If backend returned non-json, still proceed with status handling
      data = null;
    }

    console.log("signup backend response:", backendRes.status, data);

    // Determine "already exists"
    const alreadyExists =
      backendRes.status === 409 ||
      data?.status === "ALREADY_EXISTS" ||
      /already\s*exists/i.test(String(data?.message ?? ""));

    if (alreadyExists) {
      return NextResponse.json(
        {
          status: "ALREADY_EXISTS",
          message: "An account with this identifier already exists. Please login.",
        },
        { status: 409 }
      );
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          status: "ERROR",
          message: data?.message || `Signup failed with status ${backendRes.status}`,
          backendRaw: data ?? null,
        },
        { status: backendRes.status }
      );
    }

    // Success
    return NextResponse.json(
      {
        status: "SUCCESS",
        message: data?.message || `Account created successfully`,
        data: data ?? null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("signup proxy error:", err);
    return NextResponse.json(
      { status: "ERROR", message: err?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
