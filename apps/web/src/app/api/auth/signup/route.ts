import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@repo/db";
import { hashPassword, createSession, getSessionCookieOptions } from "@/lib/auth";
import { UserSignupSchema } from "@/schemas/index";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = UserSignupSchema.parse(body);

    // Check if user already exists
    const existingUser = await queryOne(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await queryOne<{
      id: string;
      name: string;
      email: string;
      image: string | null;
    }>(
      `INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, false, NOW(), NOW())
       RETURNING id, name, email, image`,
      [name, email, passwordHash]
    );

    if (!user) {
      return Response.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create session
    const token = await createSession(user.id);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      },
      { status: 201 }
    );

    // Set session cookie
    const cookieOptions = getSessionCookieOptions(token);
    response.cookies.set(cookieOptions);

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    console.error("Signup error:", error);
    return Response.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
