# BISMAN ERP Deployment (diployment branch)

This branch is your deployment bundle. It contains Dockerfiles, a compose file, and an Nginx proxy config. App code comes from the base branch snapshot used to prepare this branch.

## Prerequisites
- Docker + Docker Compose
- A .env file at repo root with at least:
  - DATABASE_URL=postgres://user:pass@db:5432/db
  - JWT_SECRET=your-secret

## Build and Run
- Build and start all services:
  - docker compose -f docker-compose.deploy.yml up -d --build
- Verify backend and DB health:
  - curl -sS http://localhost/api/health
  - curl -sS http://localhost/api/health/database

## Nginx Routing
- / → frontend:3000
- /api → backend:3001

## Database Migrations
- Run inside backend container:
  - docker compose -f docker-compose.deploy.yml exec backend npx prisma migrate deploy

## Notes
- Adjust NEXT_PUBLIC_API_BASE_URL and exposed ports as needed for your server/domain.
