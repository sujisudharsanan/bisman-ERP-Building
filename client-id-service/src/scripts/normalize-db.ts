import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();
const pool = new Pool({ connectionString: process.env.DB_URL });

async function normalize() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT client_id FROM client_ids');
    for (const row of res.rows) {
      const raw: string = row.client_id;
      const fixed = raw.trim();
      if (fixed !== raw) {
        // update normalized value
        await client.query('UPDATE client_ids SET client_id=$1 WHERE client_id=$2', [fixed, raw]);
        console.log(`Normalized ${raw} -> ${fixed}`);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed', e);
  } finally {
    client.release();
    await pool.end();
  }
}

normalize().catch(console.error);
