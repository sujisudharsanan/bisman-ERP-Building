// OTP service: secure generation, hashing, verification, rate limiting
const crypto = require('crypto');
const { getPrisma } = require('../lib/prisma');
const { sendMail } = require('./mailer');
const { otpTemplate } = require('./emailTemplates');
const logger = require('../utils/logger');

const prisma = (()=>{ try { return getPrisma(); } catch { return null; }})();
const OTP_LEN = Number(process.env.OTP_LENGTH || 6);
const EXPIRE_MIN = Number(process.env.OTP_EXPIRE_MIN || 5);
const HASH_SECRET = process.env.OTP_HASH_SECRET || 'dev_otp_secret';

const RATE_EMAIL_HOURLY = Number(process.env.RATE_LIMIT_EMAIL || 5);
const RATE_IP_HOURLY = Number(process.env.RATE_LIMIT_IP || 20);

function genOtp() {
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE() % 1000000; // 0..999999
  return String(num).padStart(OTP_LEN, '0');
}

function hmac(otp, email, purpose) {
  return crypto.createHmac('sha256', HASH_SECRET).update(`${email}|${purpose}|${otp}`).digest('hex');
}

async function rateCheck(email, ip) {
  if (!prisma) return; // skip in no-db env
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const countEmail = await prisma.otpToken.count({ where: { email, created_at: { gte: since } } });
  if (countEmail >= RATE_EMAIL_HOURLY) throw new Error('Rate limit exceeded for this email');
  const countIp = await prisma.otpToken.count({ where: { ip_address: ip, created_at: { gte: since } } });
  if (countIp >= RATE_IP_HOURLY) throw new Error('Rate limit exceeded for this IP');
}

async function sendOTP({ email, purpose = 'login', ip, ua }) {
  const now = new Date();
  const otp = genOtp();
  const otp_hash = hmac(otp, email, purpose);
  const expires_at = new Date(now.getTime() + EXPIRE_MIN * 60 * 1000);
  await rateCheck(email, ip);
  const rec = await prisma.otpToken.create({ data: { email, purpose, otp_hash, expires_at, ip_address: ip, user_agent: ua, last_sent_at: now } });
  const ts = new Date().toISOString();
  const { html, text } = otpTemplate({ email, otp, purpose, ip, ua, ts });
  await sendMail({ to: email, subject: 'Your One-Time Passcode', html, text });
  logger.info(`[otp] sent purpose=${purpose} to=${email.replace(/(.).+(@.*)/, '$1***$2')}`);
  return { success: true, id: rec.id, expires_at };
}

async function verifyOTP({ email, otp, purpose = 'login', ip, ua }) {
  const now = new Date();
  const otp_hash = hmac(otp, email, purpose);
  const rec = await prisma.otpToken.findFirst({ where: { email, purpose, verified: false }, orderBy: { created_at: 'desc' } });
  if (!rec) return { success: false, error: 'OTP not found' };
  if (rec.blocked_until && rec.blocked_until > now) return { success: false, error: 'Too many attempts, try later' };
  if (rec.expires_at < now) return { success: false, error: 'OTP expired' };
  const attempts = rec.attempts + 1;
  const maxAttempts = 5;
  const ok = rec.otp_hash === otp_hash;
  if (!ok && attempts >= maxAttempts) {
    await prisma.otpToken.update({ where: { id: rec.id }, data: { attempts, blocked_until: new Date(now.getTime() + 15 * 60 * 1000) } });
    return { success: false, error: 'Too many attempts' };
  }
  if (!ok) {
    await prisma.otpToken.update({ where: { id: rec.id }, data: { attempts } });
    return { success: false, error: 'Invalid OTP' };
  }
  await prisma.otpToken.update({ where: { id: rec.id }, data: { verified: true, attempts, ip_address: ip || rec.ip_address, user_agent: ua || rec.user_agent } });
  return { success: true };
}

async function cleanupExpired() {
  const now = new Date();
  const del = await prisma.otpToken.deleteMany({ where: { OR: [ { expires_at: { lt: now } }, { verified: true, created_at: { lt: new Date(now.getTime() - 24*60*60*1000) } } ] } });
  return del.count;
}

module.exports = { sendOTP, verifyOTP, cleanupExpired, hmac };
