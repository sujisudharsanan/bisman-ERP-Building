DB helper scripts

1) Verify DB connectivity

  # ensure DATABASE_URL is set in env or .env
  node scripts/check-db.js

2) Create initial admin user

  # usage: node scripts/create-admin.js [email] [password] [role]
  node scripts/create-admin.js admin@local admin123 ADMIN

This script will create simple `roles` and `users` tables if missing and upsert the admin user with a bcrypt-hashed password.

3) Health endpoint

The Nest API exposes `/api/health/db` which runs a lightweight `SELECT 1` against the configured DATABASE_URL. Use this to confirm connectivity from the API process.

4) Test sequence

  - Run `node scripts/check-db.js` to verify DB connectivity from the script runner.
  - Start the Nest API (dev or prod) and call `GET /api/health/db`.
  - Run `node scripts/create-admin.js admin@local admin123 ADMIN` to insert an admin.
  - POST to `/api/login` with the admin credentials (the auth controller currently accepts any credentials in dev; adapt as needed).
  - GET `/api/me` and the dashboard to confirm auth flows.
