import { NextRequest, NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ message: "Signed out successfully" });

    // Clear the session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Signout error:", error);
    return Response.json(
      { error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
