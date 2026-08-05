import { NextRequest, NextResponse } from "next/server";
import { Redis } from "ioredis";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

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
    redisClient.on("error", (err) => {
      console.error("Web rate-limit Redis error:", err);
    });
  }
  return redisClient;
}

export async function checkRateLimit(
  identifier: string,
  limit = 30,
  windowSec = 60
): Promise<{ success: boolean; remaining: number; resetSec: number }> {
  const redis = getRedisClient();
  if (!redis) {
    return { success: true, remaining: limit, resetSec: 0 };
  }

  try {
    const key = `ratelimit:web:${identifier}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSec);
    }
    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, limit - current);
    const resetSec = ttl > 0 ? ttl : windowSec;

    return {
      success: current <= limit,
      remaining,
      resetSec,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    return { success: true, remaining: limit, resetSec: 0 };
  }
}

export function withRateLimit<T extends unknown[] = unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
  options: { limit?: number; windowSec?: number } = {}
) {
  const limit = options.limit ?? 30;
  const windowSec = options.windowSec ?? 60;

  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const user = await getAuthenticatedUser(request);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const identifier = user ? `user:${user.id}` : `ip:${ip}`;

    const rateResult = await checkRateLimit(identifier, limit, windowSec);

    if (!rateResult.success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": rateResult.resetSec.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const response = await handler(request, ...args);
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateResult.remaining.toString());
    return response;
  };
}
