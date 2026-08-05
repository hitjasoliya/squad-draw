import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const user = await getSessionFromToken(token);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null });
  }
}
