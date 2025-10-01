import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private pool: Pool | null = null;
  private jwtSecret = process.env.JWT_SECRET || 'dev-secret';

  constructor() {
    const databaseUrl = process.env.DATABASE_URL || null;
    if (databaseUrl) {
      this.pool = new Pool({ connectionString: databaseUrl });
    } else {
      this.logger.warn('DATABASE_URL not set — auth will fall back to dev token behavior');
    }
  }

  /** Validate email/password against DB users table. Returns user row (without password) or null */
  async validateUser(email: string | undefined | null, password: string | undefined | null) {
    if (!email || !password) return null;
    if (!this.pool) {
      // dev fallback: accept any credential and return a fake user
      return { id: 'dev-user', email: email, role: 'admin' };
    }
    const client = await this.pool.connect();
    try {
      const res = await client.query('SELECT id, email, password, role_id FROM users WHERE email = $1', [email]);
      if (!res.rows || res.rows.length === 0) return null;
      const row = res.rows[0];
      const hash = row.password;
      const match = await bcrypt.compare(password, hash);
      if (!match) return null;
      // optionally fetch role name
      let roleName = null;
      if (row.role_id) {
        const r = await client.query('SELECT name FROM roles WHERE id = $1', [row.role_id]);
        if (r.rows && r.rows[0]) roleName = r.rows[0].name;
      }
      return { id: row.id, email: row.email, role: roleName };
    } finally {
      client.release();
    }
  }

  /** Sign a JWT for a user payload */
  signToken(payload: any) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '8h' });
  }

  /** Accepts an Authorization header or raw token and returns a user or null */
  async getUserFromToken(authHeader: string | undefined | null) {
    if (!authHeader) return null;
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();

    // dev fallback
    if (!this.pool && token === 'devtoken') {
      return { id: 'dev-user', username: 'dev', email: 'dev@example.local', role: 'admin' };
    }

    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);
      const sub = decoded && decoded.sub;
      if (!sub) return null;
      if (!this.pool) return null;
      const client = await this.pool.connect();
      try {
        const res = await client.query('SELECT id, email, role_id FROM users WHERE id = $1', [sub]);
        if (!res.rows || res.rows.length === 0) return null;
        const row = res.rows[0];
        let roleName = null;
        if (row.role_id) {
          const r = await client.query('SELECT name FROM roles WHERE id = $1', [row.role_id]);
          if (r.rows && r.rows[0]) roleName = r.rows[0].name;
        }
        return { id: row.id, email: row.email, role: roleName };
      } finally {
        client.release();
      }
    } catch (e) {
      this.logger.debug('token verify failed', e && (e as any).message);
      return null;
    }
  }

  async closePool() {
    if (this.pool) {
      try { await this.pool.end(); } catch (e) { /* ignore */ }
    }
  }
}

