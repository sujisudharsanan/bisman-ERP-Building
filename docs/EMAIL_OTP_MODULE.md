# Email + OTP Module (Enterprise)

This module provides:
- Pooled SMTP mailer (Bluehost-ready) with RFC headers
- OTP generation/verification with HMAC-SHA256, expiring tokens, and rate limits
- Login notifications and generic notifications

## Endpoints
- POST /api/security/send-otp { email, purpose }
- POST /api/security/verify-otp { email, otp, purpose }
- POST /api/security/send-notification { to, subject, html }
- POST /api/security/login-success { to, ip, ua }
- POST /api/security/login-failed { to, ip, ua }

## Env
See `my-backend/.env.example` for full list.

## Security
- OTP never logged. Email masked.
- HMAC secret required in production.
- Headers sanitize to prevent injection.
- TLS enforced, rejectUnauthorized true.

## Notes
- Add DKIM keys if available for better deliverability.
- Adjust rate limits via env as needed.
