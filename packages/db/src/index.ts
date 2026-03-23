import { Pool } from "pg";
import type { QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function transaction<T>(
  fn: (client: {
    query: <R extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) => Promise<R[]>;
    queryOne: <R extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) => Promise<R | null>;
  }) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn({
      query: async <R extends QueryResultRow>(text: string, params?: any[]) => {
        const res = await client.query<R>(text, params);
        return res.rows;
      },
      queryOne: async <R extends QueryResultRow>(text: string, params?: any[]) => {
        const res = await client.query<R>(text, params);
        return res.rows[0] || null;
      },
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { getPool as pool };

// TypeScript types matching the schema
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  image: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  token: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

export interface Room {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  owner_id: string;
  is_shared: boolean;
}

export interface RoomMember {
  id: string;
  role: "ADMIN" | "MEMBER";
  joined_at: Date;
  user_id: string;
  room_id: string;
}

export interface Shape {
  id: string;
  type: ShapeType;
  data_from_rough_js: any;
  created_at: Date;
  updated_at: Date;
  room_id: string;
  creator_id: string;
}

export interface Message {
  id: string;
  message: string;
  created_at: Date;
  user_id: string;
  room_id: string;
}

export type ShapeType =
  | "RECTANGLE"
  | "DIAMOND"
  | "ELLIPSE"
  | "LINE"
  | "ARROW"
  | "FREEDRAW"
  | "TEXT"
  | "IMAGE";

export type RoomMemberRole = "ADMIN" | "MEMBER";
