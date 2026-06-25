import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

const BACKEND = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const accessToken = auth;
    const backendRes = await fetch(`${BACKEND}/api/mobile/event/confirm-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!backendRes.ok) {
      const errorData = await backendRes.json();
      return NextResponse.json(errorData, { status: backendRes.status });
    }
    const data = await backendRes.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { message: "Error confirming payment", error: String(error) },
      { status: 500 }
    );
  }
}
