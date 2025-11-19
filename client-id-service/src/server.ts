import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pino from 'pino';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { generateClientId, GenerateOptions } from './lib/id.js';
import basicAuth from 'express-basic-auth';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { insertWithRetry, getIdempotent, storeIdempotent } from './db.js';

// load env
dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(helmet());
app.use(bodyParser.json());

const PORT = Number(process.env.PORT || 4000);
const API_KEYS = (process.env.API_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
const HMAC_SECRET = process.env.HMAC_SECRET || '';
const RATE_POINTS = Number(process.env.RATE_LIMIT_POINTS || 10);
const RATE_DURATION = Number(process.env.RATE_LIMIT_DURATION || 60);

// DB pool (optional)
const pool = new Pool({ connectionString: process.env.DB_URL });

// simple rate limiter by IP
const rateLimiter = new RateLimiterMemory({ points: RATE_POINTS, duration: RATE_DURATION });

// simple API key middleware (also accept Authorization: Bearer <jwt>)
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.header('x-api-key');
  const auth = req.header('authorization');
  if (apiKey && API_KEYS.includes(apiKey)) {
    // attach metadata
    (req as any).auth = { method: 'api_key', key: apiKey };
    return next();
  }
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || '');
      (req as any).auth = { method: 'jwt', payload };
      return next();
    } catch (e) {
      // fallthrough
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// rate limit middleware
async function rateMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const key = req.ip;
    await rateLimiter.consume(key);
    return next();
  } catch (rlRejected) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }
}

app.post('/api/client-ids', rateMiddleware, authMiddleware, async (req: Request, res: Response) => {
  // optional: idempotency token
  const idempotency = (req.header('x-idempotency-token') || req.body.idempotencyToken) as string | undefined;
  const { region, format, signed, prefix, suffix } = req.body || {};
  const opts: GenerateOptions = { region, format, signed, prefix, suffix };
  const issuedAt = new Date().toISOString();
  // idempotency: return stored id if token exists
  try {
    if (idempotency) {
      const existing = await getIdempotent(idempotency);
      if (existing) {
        return res.json({ client_id: existing, issued_at: issuedAt, region: region || null });
      }
    }
  } catch (e) {
    logger.warn({ err: e }, 'idempotency lookup failed');
  }

  // generate ID
  const id = generateClientId(opts, signed ? HMAC_SECRET : undefined);

  // audit logging (do not log secrets)
  const auditor = { at: issuedAt, by: (req as any).auth?.method || 'unknown', meta: { ip: req.ip } };
  logger.info({ event: 'client_id_issued', client_id_hash: id.slice(0, 8), auditor }, 'issued id');

  // optional: persist to DB
  try {
    if (pool) {
      const maxAttempts = Number(process.env.ID_INSERT_MAX_ATTEMPTS || 5);
      // try to persist; if duplicate, regenerate a few times
      let attempts = 0;
      let inserted = false;
      let currentId = id;
      while (attempts < maxAttempts && !inserted) {
        const res = await insertWithRetry(currentId, region || null, issuedAt, 1);
        if (res.ok) { inserted = true; break; }
        if (res.error === 'duplicate') {
          // regenerate id and retry
          attempts++;
          currentId = generateClientId(opts, signed ? HMAC_SECRET : undefined);
          continue;
        }
        break;
      }
      // if not inserted, log but still return generated id to client
    }
  } catch (e) {
    logger.error({ err: e }, 'db insert failed');
  }

  // store idempotency mapping if provided
  try {
    if (idempotency) await storeIdempotent(idempotency, id);
  } catch (e) {
    logger.warn({ err: e }, 'failed to store idempotency mapping');
  }

  res.json({ client_id: id, issued_at: issuedAt, region: region || null });
});

app.get('/health', (req: Request, res: Response) => res.json({ ok: true }));

app.listen(PORT, () => {
  logger.info(`Client ID service running on port ${PORT}`);
});
