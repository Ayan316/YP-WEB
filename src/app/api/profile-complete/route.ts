import { NextResponse } from "next/server";


export async function GET() {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/home`;

  const res = NextResponse.redirect(url);

  res.cookies.set("profile_completed", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 365 * 80,
  });

  return res;
}
