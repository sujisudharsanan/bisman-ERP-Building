# Trial OTP Quick Onboarding

This document describes the lightweight, mobile-first trial onboarding flow backed by Redis OTP.

## Endpoints (mounted at /api/trial)
- GET /modules/list → returns available modules for selection
- POST /request-otp { email, mobile, businessType, employeeCount, locationCountry, locationCity, companyType, deviceInfo?, captcha_token? }
  - Validates inputs, blocks disposable email domains
  - Rate-limits per IP and per email. If thresholds exceeded, returns { error: 'rate_limited', requireCaptcha: true }
  - On success: { success, requestId, ttlSeconds }
- POST /verify-otp { requestId, code }
  - 5 attempts max; returns { success, tempToken, remainingAttempts }
- POST /resend-otp { requestId }
  - Max 3 resends; extends TTL slightly with a cap; returns { success, ttlSeconds }
- POST /complete { requestId, tempToken, modules: string[], demoData?: boolean }
  - Requires verification; creates a trial client (when Prisma available) with settings.enterprise.trialQuick

## Environment variables
- TRIAL_OTP_LENGTH: default 6
- TRIAL_OTP_TTL_SEC: default 600 (10 minutes)
- TRIAL_OTP_REQ_PER_EMAIL: default 5/hour
- TRIAL_OTP_REQ_PER_IP: default 20/hour
- TRIAL_OTP_RESEND_MAX: default 3
- OTP_HASH_SECRET: HMAC secret for OTP hashing
- REDIS_URL: connection string; if absent, redis client falls back to in-memory store (development only)

## Frontend
- Quick flow page at /onboarding/trial/quick
  - Step 1: Signup form with Zod validation
  - Step 2: OTP input + modules selection
  - Autosave draft to localStorage (24h)
  - Countdown timer and Resend code button added

## Security notes
- OTP values are never logged; only hashed in Redis
- Disposable email domains blocked by default list (extend as needed)
- Mail-based OTP route is deprecated and disabled by default (ENABLE_LEGACY_MAIL_OTP=0). Prefer the Redis-backed trial endpoints.
- Integrate real email/SMS provider for notification needs if re-enabled explicitly.
- Consider adding reCAPTCHA/hCaptcha integration for request-otp when rate limit is hit

## Testing
- Unit tests should cover: invalid email/mobile, rate limit behavior, invalid OTP attempts, resend limits, and completion without modules.
