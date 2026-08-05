import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { NextRequest } from "next/server";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const user = await getSessionFromToken(token);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image || undefined,
  };
}

type AuthHandler<T extends unknown[] = unknown[]> = (
  request: NextRequest,
  user: AuthenticatedUser,
  ...args: T
) => Promise<Response>;

export function withAuth<T extends unknown[] = unknown[]>(handler: AuthHandler<T>) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return handler(request, user, ...args);
  };
}

type OptionalAuthHandler<T extends unknown[] = unknown[]> = (
  request: NextRequest,
  user: AuthenticatedUser | null,
  ...args: T
) => Promise<Response>;

export function withOptionalAuth<T extends unknown[] = unknown[]>(
  handler: OptionalAuthHandler<T>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const user = await getAuthenticatedUser(request);
    return handler(request, user, ...args);
  };
}
