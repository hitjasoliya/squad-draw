import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@repo/db";
import { verifyPassword, createSession, getSessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await queryOne<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      email_verified: boolean;
      image: string | null;
    }>(
      "SELECT id, name, email, password_hash, email_verified, image FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (!user) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session
    const token = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });

    // Set session cookie
    const cookieOptions = getSessionCookieOptions(token);
    response.cookies.set(cookieOptions);

    return response;
  } catch (error) {
    console.error("Signin error:", error);
    return Response.json(
      { error: "Failed to sign in" },
      { status: 500 }
    );
  }
}
