import { NextRequest } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return Response.json({ user: null });
    }

    const user = await getSessionFromToken(token);

    if (!user) {
      return Response.json({ user: null });
    }

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    return Response.json({ user: null });
  }
}
