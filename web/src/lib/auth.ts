import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-prod";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const SESSION_COOKIE_NAME = "squad_session";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface TokenPayload extends jose.JWTPayload {
  sub: string;
  name: string;
  email: string;
  image: string | null;
  tv: number;
}

export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromToken(token: string): Promise<AuthenticatedUser | null> {
  const payload = await verifyJWT(token);
  if (!payload || !payload.sub) {
    return null;
  }
  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    image: payload.image ?? null,
  };
}

export function getSessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    sameSite: "lax" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  };
}
