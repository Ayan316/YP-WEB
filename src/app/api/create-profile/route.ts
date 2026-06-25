import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

const BACKEND = process.env.BACKEND_URL;

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const accessToken = auth;

    const formData = await req.formData()

    const res = await fetch(`${BACKEND}/api/mobile/V1/create-profile`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Create profile proxy error:', data)
      return NextResponse.json(
        { message: data.message || 'Profile creation failed' },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Create profile proxy error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
