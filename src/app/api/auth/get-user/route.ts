// src/app/api/auth/get-user/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("user_info")?.value;
    if (!raw) return NextResponse.json({ ok: true, user: null });

    const user = JSON.parse(decodeURIComponent(raw));
    // return minimal public-safe fields if you prefer
    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number ?? null,
      status: user.status ?? null,
      image: user.image ?? null,
      profile_completion_status: user.profile_completion_status ?? null,
    };
    return NextResponse.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error("get-user error", err);
    return NextResponse.json({ ok: false, error: "Failed to read user" }, { status: 500 });
  }
}
