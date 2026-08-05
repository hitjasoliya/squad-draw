import { Redis } from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    redisClient.on("error", (err) => {
      console.error("Redis client error:", err);
    });
  }
  return redisClient;
}

export { getRedisClient as redis };
