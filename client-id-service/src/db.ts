import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DB_URL });

export async function insertClientId(clientId: string, region?: string, issuedAt?: string): Promise<boolean> {
  const text = 'INSERT INTO client_ids(client_id, region, issued_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING';
  const res = await pool.query(text, [clientId, region || null, issuedAt || new Date().toISOString()]);
  return (res.rowCount || 0) > 0;
}

export async function insertWithRetry(clientId: string, region?: string, issuedAt?: string, maxAttempts = 5) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const ok = await insertClientId(clientId, region, issuedAt);
      if (ok) return { ok: true, attempts };
      // conflict happened (rowCount === 0)
      return { ok: false, attempts };
    } catch (e: any) {
      // detect duplicate key error (Postgres code 23505) -> regenerate caller should handle
      if (e && e.code === '23505') {
        // conflict, caller should attempt a new id
        return { ok: false, attempts, error: 'duplicate' };
      }
      if (attempts >= maxAttempts) return { ok: false, attempts, error: e };
      // small backoff
      await new Promise(r => setTimeout(r, 50 * attempts));
    }
  }
  return { ok: false, attempts };
}

export async function getIdempotent(token: string): Promise<string | null> {
  const res = await pool.query('SELECT client_id FROM idempotency_tokens WHERE token=$1', [token]);
  if (res.rowCount === 0) return null;
  return res.rows[0].client_id;
}

export async function storeIdempotent(token: string, clientId: string) {
  await pool.query('INSERT INTO idempotency_tokens(token, client_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [token, clientId]);
}

export default pool;
