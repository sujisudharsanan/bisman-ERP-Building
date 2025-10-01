import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DbHealthService {
  private readonly logger = new Logger(DbHealthService.name);
  private pool: Pool | null = null;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL || null;
    if (!databaseUrl) {
      this.logger.warn('DATABASE_URL not set; DB health checks will fail');
      return;
    }
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async check() {
    if (!this.pool) throw new Error('DATABASE_URL not configured');
    const client = await this.pool.connect();
    try {
      const res = await client.query('SELECT 1 as ok');
      return res.rows && res.rows[0] && res.rows[0].ok === 1;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      try { await this.pool.end(); } catch (e) { /* ignore */ }
    }
  }
}
