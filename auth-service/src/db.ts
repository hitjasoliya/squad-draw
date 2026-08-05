import { Pool } from "pg";
import type { QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return (rows[0] ?? null) as T | null;
}

export async function transaction<T>(
  fn: (client: {
    query: <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<R[]>;
    queryOne: <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<R | null>;
  }) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn({
      query: async <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => {
        const res = await client.query<R>(text, params);
        return res.rows;
      },
      queryOne: async <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => {
        const res = await client.query<R>(text, params);
        return (res.rows[0] ?? null) as R | null;
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

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  token_version: number;
  image: string | null;
  created_at: Date;
  updated_at: Date;
}
