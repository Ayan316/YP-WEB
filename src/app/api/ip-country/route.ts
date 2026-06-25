// src/app/api/ip-country/route.ts
import { NextResponse } from "next/server";


export async function GET() {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      headers: {
        "User-Agent": "Next.js App",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch IP data");
    }

    const data = await res.json();

    console.log("Detected IP Data: ", data);

    return NextResponse.json({
      country: data.country || "GB",
      success: true,
    });
  } catch(error) {
    console.error("IP country detection failed", error);
    return NextResponse.json(
      { 
        country: "GB",
        success: false,
        message: "Unable to detect country from IP falling back to GB"
      },
      { status: 200 }
    );
  }
}
