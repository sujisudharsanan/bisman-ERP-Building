import { v4 as uuidv4 } from 'uuid';
import { ulid } from 'ulid';
import crypto from 'node:crypto';
import base32Encode from 'base32-encode';

export type Format = 'uuid' | 'ulid';

export interface GenerateOptions {
  region?: string; // ISO 3166-1 alpha-2 e.g. IN
  prefix?: string; // optional prefix (overrides region if provided)
  suffix?: string;
  format?: Format;
  signed?: boolean; // include HMAC signature
  checksum?: boolean; // include CRC32-ish checksum (we'll implement CRC32)
}

// Generate UUID v4 (canonical) normalized to lowercase
export function generateUuid(): string {
  return uuidv4().toLowerCase();
}

// Generate ULID (compact, time-sortable)
export function generateUlid(): string {
  return ulid();
}

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

// Simple CRC32 implementation (polynomial 0xEDB88320)
export function crc32(str: string): number {
  const table = (() => {
    let c: number;
    const table = new Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  let crc = 0 ^ (-1);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc = (crc >>> 8) ^ table[(crc ^ code) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

export function crc32Base32(str: string): string {
  const c = crc32(str);
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(c, 0);
  // base32 encode without padding
  return base32Encode(buf, 'RFC4648', { padding: false }).toLowerCase();
}

export function hmacSign(id: string, secret: string, truncate = 16): string {
  const mac = crypto.createHmac('sha256', secret).update(id).digest();
  // base64url without padding
  const b64 = mac.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64.slice(0, truncate);
}

export function buildId(base: string, opts: GenerateOptions = {}, hmacSecret?: string): string {
  const id = normalizeId(base);
  const prefix = opts.prefix ?? (opts.region ? opts.region.toUpperCase() : undefined);
  const withPrefix = prefix ? `${prefix}-${id}` : id;
  const withSuffix = opts.suffix ? `${withPrefix}-${opts.suffix}` : withPrefix;
  let out = withSuffix;
  if (opts.checksum) {
    out = `${out}-${crc32Base32(out)}`;
  }
  if (opts.signed) {
    if (!hmacSecret) throw new Error('HMAC secret required for signed IDs');
    out = `${out}|${hmacSign(out, hmacSecret)}`;
  }
  return out;
}

export function generateClientId(opts: GenerateOptions = {}, hmacSecret?: string): string {
  const fmt = opts.format || 'uuid';
  const base = fmt === 'uuid' ? generateUuid() : generateUlid();
  return buildId(base, opts, hmacSecret);
}

export default { generateClientId, hmacSign };

export function isValidUuid(id: string): boolean {
  // simple regex for uuid v4 format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function isValidClientId(id: string, opts: { expectSigned?: boolean; hmacSecret?: string } = {}): boolean {
  if (!id || typeof id !== 'string') return false;
  const normalized = id.trim();
  const parts = normalized.split('|');
  const payload = parts[0];
  const signature = parts[1];
  if (opts.expectSigned && !signature) return false;
  if (signature && opts.hmacSecret) {
    const expected = hmacSign(payload, opts.hmacSecret);
    if (expected !== signature) return false;
  }
  // strip checksum suffix if present
  const checksumMatch = payload.match(/(.+)-([a-z2-7]+)$/);
  const main = checksumMatch ? checksumMatch[1] : payload;
  // allow prefixed region like IN-uuid
  const mainPart = main.includes('-') ? main.split('-').slice(1).join('-') : main;
  return isValidUuid(mainPart) || /^[0-9A-Z]{26}$/i.test(mainPart); // crude ULID check
}

export function normalizeClientId(id: string): string {
  return id.trim().toLowerCase();
}
