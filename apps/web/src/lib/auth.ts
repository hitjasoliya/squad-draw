import { query, queryOne } from "@repo/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import type { User } from "@repo/db";

const SESSION_COOKIE_NAME = "squad_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_CACHE_TTL_MS = 30_000; // 30 seconds

// In-memory session cache to avoid DB hit on every API request
const sessionCache = new Map<string, { user: User; cachedAt: number }>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Delete all existing sessions for this user (single device enforcement)
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);

  await query(
    "INSERT INTO sessions (id, token, user_id, expires_at, created_at) VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())",
    [token, userId, expiresAt]
  );

  return token;
}

export async function getSessionFromToken(
  token: string
): Promise<User | null> {
  // Check cache first
  const cached = sessionCache.get(token);
  if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    return cached.user;
  }

  const row = await queryOne<User & { session_expires_at: Date }>(
    `SELECT u.id, u.name, u.email, u.email_verified, u.image, u.created_at, u.updated_at, s.expires_at as session_expires_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1`,
    [token]
  );

  if (!row) {
    sessionCache.delete(token);
    return null;
  }

  // Check if session is expired
  if (new Date(row.session_expires_at) < new Date()) {
    await query("DELETE FROM sessions WHERE token = $1", [token]);
    sessionCache.delete(token);
    return null;
  }

  const user: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    email_verified: row.email_verified,
    image: row.image,
    created_at: row.created_at,
    updated_at: row.updated_at,
    password_hash: "",
  };

  // Cache the result
  sessionCache.set(token, { user, cachedAt: Date.now() });

  return user;
}

export async function deleteSession(token: string): Promise<void> {
  sessionCache.delete(token);
  await query("DELETE FROM sessions WHERE token = $1", [token]);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

export function getSessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  };
}

export { SESSION_COOKIE_NAME };
