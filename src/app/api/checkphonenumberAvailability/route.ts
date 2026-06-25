import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/checkphonenumberAvailability
 *
 * Body:    { phone_number: string }
 * Forwards to backend POST `/api/mobile/check-phone-availability`.
 *
 * Frontend reads `data.available`, so this route always returns
 * `{ status, message, data: { available } }`. On any backend failure
 * `available` is forced to `false` and the original status code is forwarded
 * so the caller can distinguish "in use" from "backend down".
 */
export async function POST(req: NextRequest) {
  const BACKEND = process.env.BACKEND_URL!;
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access")?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          status: "ERROR",
          message: "Unauthorized: No access token",
          data: { available: false },
        },
        { status: 401 }
      );
    }

    // Read body as text first so we can log exactly what came in. This
    // makes the axios "retry-after-refresh double-stringify" failure mode
    // visible in the dev terminal.
    const rawBody = await req.text();
    console.log("[check-phone] req body raw:", rawBody);

    let body: any = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
        // Axios occasionally double-stringifies on retry → first parse yields
        // a JSON string, second parse yields the object.
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch {
            /* leave body as the string */
          }
        }
      } catch {
        body = {};
      }
    }

    const phoneNumber =
      typeof body === "object" && body !== null
        ? String(body?.phone_number ?? "").trim()
        : "";

    if (!phoneNumber) {
      console.warn(
        "[check-phone] phone_number missing from request — parsed body:",
        body,
      );
      return NextResponse.json(
        {
          status: "ERROR",
          message: "phone_number is required",
          data: { available: false },
        },
        { status: 400 }
      );
    }

    const upstream = await fetch(
      `${BACKEND}/api/mobile/check-phone-availability`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_number: phoneNumber }),
      }
    );

    let data: any = null;
    const text = await upstream.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    console.log("Check phone availability response from backend:", data);

    if (!upstream.ok) {
      return NextResponse.json(
        {
          status: data?.status ?? "ERROR",
          message:
            data?.message ||
            `Backend returned ${upstream.status} ${upstream.statusText}`,
          data: { available: false },
        },
        { status: upstream.status }
      );
    }

    // Backend OK but body missing / malformed — don't silently report "in use".
    if (!data || typeof data !== "object" || typeof data?.data?.available !== "boolean") {
      return NextResponse.json(
        {
          status: data?.status ?? "ERROR",
          message:
            data?.message ||
            "Malformed backend response (missing data.available).",
          data: { available: false },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: upstream.status || 200 });
  } catch (error: any) {
    console.error("check-phone-availability proxy error:", error);
    return NextResponse.json(
      {
        status: "ERROR",
        message: error?.message || "Internal server error",
        data: { available: false },
      },
      { status: 500 }
    );
  }
}
