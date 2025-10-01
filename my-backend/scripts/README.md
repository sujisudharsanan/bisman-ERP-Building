DB helper scripts

1) Verify DB connectivity

  node scripts/check-db.js

2) Create initial admin user

  # usage: node scripts/create-admin.js [email] [password] [role]
  node scripts/create-admin.js admin@local admin123 ADMIN

This script will create simple `roles` and `users` tables if missing and upsert the admin user with a bcrypt-hashed password.

3) Health endpoint


4) Test sequence

  - Run `node scripts/check-db.js` to verify DB connectivity from the script runner.
  - Start the Nest API (dev or prod) and call `GET /api/health/db`.
  - Run `node scripts/create-admin.js admin@local admin123 ADMIN` to insert an admin.
  - POST to `/api/login` with the admin credentials (the auth controller currently accepts any credentials in dev; adapt as needed).
  - GET `/api/me` and the dashboard to confirm auth flows.

  4) Create test user (guarded)

  The script `create-test-user.js` is intentionally guarded; it will only run when the `CONFIRM` environment variable is set to `yes` and `CREATE_USER_EMAIL` and `CREATE_USER_PASSWORD` are provided.

  Example:

  ```bash
  CONFIRM=yes CREATE_USER_EMAIL=test2@test CREATE_USER_PASSWORD=Test1234 DATABASE_URL='postgresql://erp_admin:StrongPassword123@localhost:5432/BISMAN' node scripts/create-test-user.js
  ```
