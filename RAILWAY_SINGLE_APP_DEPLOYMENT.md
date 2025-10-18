# Railway Single-App Deployment (Backend + Frontend)

This repository is configured to deploy a single Docker-based Railway service that builds the Next.js frontend, exports static files, generates Prisma Client, and serves both the API and UI via Express.

## What the Dockerfile does
- Installs backend deps and copies `my-backend/prisma` first
- Runs `npm ci --ignore-scripts` to install deterministically
- Generates Prisma Client with `npx prisma generate`
- Installs and builds the Next.js app under `my-frontend`, runs `next export`
- Copies `my-frontend/out` into the final image and serves it from Express
- Starts `node server.js` via `dumb-init`

## Server static serving
`my-backend/server.js` will:
- Keep all `/api/*` routes handled by Express (from `app.js`)
- Serve static frontend from `/app/frontend/out`
- Use a catch-all `app.get('*')` to return `index.html` for client routing

## Railway service settings
- Service type: Docker
- Dockerfile path: repository root `Dockerfile`
- Auto deploy on push: Enabled
- Environment variables:
  - `NODE_ENV=production`
  - `PORT=8080`
  - `DATABASE_URL=postgres://...` (Railway Postgres URL)
  - `JWT_SECRET=<strong-secret>`
  - `NEXT_PUBLIC_API_URL=https://<this-service>.up.railway.app`

## Notes
- `.dockerignore` keeps the build context small to avoid timeouts.
- No Next.js rewrites are needed in production; all frontend calls use `/api/*` to the same origin.
- For local dev, run backend and frontend separately; in production, the container serves both.
