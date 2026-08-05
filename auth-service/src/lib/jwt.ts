import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-prod";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload extends jose.JWTPayload {
  sub: string;
  name: string;
  email: string;
  image: string | null;
  tv: number;
}

export async function signToken(data: {
  sub: string;
  name: string;
  email: string;
  image?: string | null;
  tv: number;
}): Promise<string> {
  return await new jose.SignJWT({
    name: data.name,
    email: data.email,
    image: data.image ?? null,
    tv: data.tv,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jose.jwtVerify(token, secretKey, {
    algorithms: ["HS256"],
  });
  return payload as unknown as TokenPayload;
}
