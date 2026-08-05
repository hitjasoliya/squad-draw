import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${AUTH_SERVICE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to create account" },
        { status: res.status }
      );
    }

    const response = NextResponse.json({ user: data.user }, { status: 201 });
    if (data.token) {
      const cookieOptions = getSessionCookieOptions(data.token);
      response.cookies.set(cookieOptions);
    }

    return response;
  } catch (error) {
    console.error("Signup proxy error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
