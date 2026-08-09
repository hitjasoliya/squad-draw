import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const res = await fetch(`${AUTH_SERVICE_URL}/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ user: null });
    }

    const data = await res.json();
    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null });
  }
}
