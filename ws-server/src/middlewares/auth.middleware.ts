import { Socket } from "socket.io";
import { parse } from "cookie";
import * as jose from "jose";
import { Redis } from "ioredis";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-prod";
const secretKey = new TextEncoder().encode(JWT_SECRET);

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: () => null,
    });
  }
  return redisClient;
}

export const authMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const clientIp =
      (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      socket.handshake.address ||
      "127.0.0.1";

    const redis = getRedisClient();
    if (redis) {
      const key = `ratelimit:ws:ip:${clientIp}`;
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, 600); // 10 minutes
      }
      if (current > 20) {
        return next(new Error("Rate limit exceeded. Too many connection attempts."));
      }
    }

    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error("Authentication error: No cookies found"));
    }

    const cookies = parse(cookieHeader);
    const token = cookies["squad_session"];

    if (!token) {
      return next(new Error("Authentication error: No session token found"));
    }

    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload || !payload.sub) {
      return next(new Error("Authentication error: Invalid token claims"));
    }

    if (redis && typeof payload.tv === "number") {
      const cachedTv = await redis.get(`auth:tv:${payload.sub}`);
      if (cachedTv !== null && parseInt(cachedTv, 10) !== payload.tv) {
        return next(new Error("Authentication error: Session revoked"));
      }
    }

    socket.data.user = {
      id: payload.sub as string,
      name: (payload.name as string) || "Anonymous",
      email: (payload.email as string) || "",
      image: (payload.image as string | null) ?? null,
    };
    socket.data.currentRoom = null;

    next();
  } catch (error) {
    console.error("WS auth middleware error:", error);
    return next(new Error("Authentication error: Invalid token"));
  }
};
