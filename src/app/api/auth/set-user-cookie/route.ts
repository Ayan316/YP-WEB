import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { user } = await req.json().catch(() => ({}));

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Missing user data" },
        { status: 400 }
      );
    }

    // Only store safe public fields (never tokens)
    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone ?? null,
      status: user.status ?? null,
      image: user.profile_image_url ?? null,
      profile_completion_status: user.profile_completion_status ?? null,
    };


    const encoded = encodeURIComponent(JSON.stringify(safeUser));

    const cookieStore = await cookies();

    cookieStore.set("user_info", encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",             // allow whole app to read
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in set-user-cookie:", err);
    return NextResponse.json(
      { ok: false, error: "Could not store user cookie" },
      { status: 500 }
    );
  }
}
