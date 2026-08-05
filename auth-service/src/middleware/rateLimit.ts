import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";

export function createRateLimiter(options: { windowSec: number; max: number; keyPrefix: string }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
      const key = `ratelimit:${options.keyPrefix}:${ip}`;
      const client = redis();

      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, options.windowSec);
      }

      const ttl = await client.ttl(key);
      res.setHeader("X-RateLimit-Limit", options.max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - current));

      if (current > options.max) {
        res.setHeader("Retry-After", ttl > 0 ? ttl : options.windowSec);
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }

      next();
    } catch (error) {
      console.error("Rate limit error:", error);
      next();
    }
  };
}

export const signupRateLimiter = createRateLimiter({
  windowSec: 60 * 60, // 1 hour
  max: 5,
  keyPrefix: "signup",
});

export const signinRateLimiter = createRateLimiter({
  windowSec: 15 * 60, // 15 minutes
  max: 10,
  keyPrefix: "signin",
});

export const sessionRateLimiter = createRateLimiter({
  windowSec: 60, // 1 minute
  max: 60,
  keyPrefix: "session",
});
