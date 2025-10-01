Prisma setup

1. Install dependencies (from my-backend):
   npm install

2. Generate the client:
   npx prisma generate

3. Create initial migration and apply:
   npx prisma migrate dev --name init

4. Seed sample users:
   node prisma/seed.js

5. Test DB via Prisma:
   node prisma/db-test.js

Notes:
- If you want the Prisma CLI as a local script, use `npm run prisma:generate` etc.
