import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4000";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await fetch(`${AUTH_SERVICE_URL}/signout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(() => {});
    }

    const response = NextResponse.json({ message: "Signed out successfully" });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}
