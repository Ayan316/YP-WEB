import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ status: "OK", message: "Logged out" });

  // Clear access cookie
  res.cookies.set("access", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0
  });

  // Clear refresh cookie
  res.cookies.set("refresh", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0
  });

  // Clear user_info cookie
  res.cookies.set("user_info", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0
  });

  return res;
}
