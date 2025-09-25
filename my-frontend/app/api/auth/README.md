This folder contains minimal demo auth endpoints used for local development only:

- POST /api/auth/login — accepts { username, password } and sets HttpOnly access_token and refresh_token cookies (demo tokens).
- POST /api/auth/refresh — reads refresh_token cookie and sets a new access_token cookie.
- POST /api/auth/logout — clears cookies.
- GET  /api/auth/me — returns a demo user when access_token cookie exists.

Security notes:
- These are demo implementations. Replace with real authentication logic (verify credentials, sign JWTs, store refresh tokens securely, rotate tokens).
- Ensure cookies have Secure and SameSite attributes in production.
- Implement CSRF protection for unsafe requests when not using SameSite=strict.
- Use HTTPS in production.
