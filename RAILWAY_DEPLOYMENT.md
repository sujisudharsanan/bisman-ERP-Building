Railway deployment (Next.js + hosted AI)

Prereqs
- Railway account and CLI (optional)
- Database provisioned and DATABASE_URL set

Env vars (Railway)
- DATABASE_URL=postgres://...
- NEXT_PUBLIC_AI_PROVIDER=api
- AI_API_BASE_URL=https://api.openai.com/v1 (or compatible)
- AI_API_KEY=sk-...
- AI_MODEL=gpt-4o-mini
- AI_EMBED_MODEL=text-embedding-3-small

Build & Run
- Service root: my-frontend
- Build command: npm ci && npx prisma generate && npm run build
- Start command: npm run start
- Port: 3000

Optional Docker
- Use the Dockerfile in my-frontend; Railway will auto-detect or you can force Docker build.

Notes
- Local Ollama is not required on Railway. The app uses the API relay at /api/ai/relay for chat and embeddings.
- If you also deploy a backend, set NEXT_PUBLIC_API_URL to point at it to reuse its /api endpoints.