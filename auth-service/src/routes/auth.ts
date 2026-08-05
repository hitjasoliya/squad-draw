import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "../db.js";
import { redis } from "../lib/redis.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import { signupRateLimiter, signinRateLimiter, sessionRateLimiter } from "../middleware/rateLimit.js";
import type { User } from "../db.js";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(1, "Name is required"),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// Cache TTL: 30 days in seconds
const TV_CACHE_TTL = 30 * 24 * 60 * 60;

authRouter.post("/signup", signupRateLimiter, async (req, res): Promise<void> => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid input" });
      return;
    }

    const { email, password, name } = parseResult.data;

    const existingUser = await queryOne<User>(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await queryOne<User>(
      `INSERT INTO users (name, email, password_hash, token_version)
       VALUES ($1, $2, $3, 0)
       RETURNING id, name, email, image, token_version`,
      [name, email.toLowerCase(), hashedPassword]
    );

    if (!user) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    const client = redis();
    await client.set(`auth:tv:${user.id}`, user.token_version.toString(), "EX", TV_CACHE_TTL);

    const token = await signToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      tv: user.token_version,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/signin", signinRateLimiter, async (req, res): Promise<void> => {
  try {
    const parseResult = signinSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid input" });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await queryOne<User>(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Increment token_version to invalidate any existing sessions (single active session enforcement)
    const updatedUser = await queryOne<User>(
      `UPDATE users
       SET token_version = token_version + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, image, token_version`,
      [user.id]
    );

    if (!updatedUser) {
      res.status(500).json({ error: "Failed to update session state" });
      return;
    }

    const client = redis();
    await client.set(`auth:tv:${updatedUser.id}`, updatedUser.token_version.toString(), "EX", TV_CACHE_TTL);

    const token = await signToken({
      sub: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      tv: updatedUser.token_version,
    });

    res.json({
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/signout", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.body?.token;

    if (!token) {
      res.json({ ok: true });
      return;
    }

    try {
      const payload = await verifyToken(token);
      const userId = payload.sub;

      await query(
        "UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1",
        [userId]
      );

      const client = redis();
      await client.del(`auth:tv:${userId}`);
    } catch {
      // Ignore token verification errors on signout
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Signout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.get("/session", sessionRateLimiter, async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const userId = payload.sub;
    const client = redis();
    let cachedTv = await client.get(`auth:tv:${userId}`);

    if (cachedTv === null) {
      const user = await queryOne<User>(
        "SELECT token_version FROM users WHERE id = $1",
        [userId]
      );
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      cachedTv = user.token_version.toString();
      await client.set(`auth:tv:${userId}`, cachedTv, "EX", TV_CACHE_TTL);
    }

    if (parseInt(cachedTv, 10) !== payload.tv) {
      res.status(401).json({ error: "Session invalidated" });
      return;
    }

    res.json({
      user: {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        image: payload.image,
      },
    });
  } catch (error) {
    console.error("Session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
