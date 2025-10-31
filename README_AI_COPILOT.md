# ERP AI Co‑Pilot (Local Ollama)

A local, RBAC‑aware AI assistant with RAG uploads, embeddings, and admin tooling.

## Requirements
- Node 18+
- Ollama running locally (default OLLAMA_URL=http://localhost:11434) with model `llama3:8b`
- SQLite (dev) or Postgres (prod)

## Setup
1) Install deps and Prisma
```
npm install
npx prisma generate
npx prisma migrate dev -n ai_copilot_init
node prisma/seed.ts
```

2) Start dev (your repo already wires AI server in dev:both)
```
npm run dev
```

## Endpoints
- Upload RAG: POST /api/admin/rag/upload (multipart)
- Reindex: POST /api/admin/rag/reindex { sourceId }
- List sources: GET /api/admin/rag/sources
- Roles: GET /api/admin/roles
- Allowed Modules (per role):
  - GET /api/admin/roles/:id/allowed-modules
  - POST /api/admin/roles/:id/allowed-modules { moduleKey }
  - DELETE /api/admin/roles/:id/allowed-modules?moduleKey=...
- AI Chat: POST /api/ai/chat { prompt, userId, mode }

## curl examples
Upload a file:
```
curl -F "file=@./README.md" -F "modules=BILLING,REPORTS" -F "userId=dev-user-1" http://localhost:3000/api/admin/rag/upload
```
Reindex a source:
```
curl -X POST -H "Content-Type: application/json" \
  -d '{"sourceId":"<ID_FROM_UPLOAD>"}' \
  http://localhost:3000/api/admin/rag/reindex
```
Chat:
```
curl -X POST -H "Content-Type: application/json" \
  -d '{"prompt":"Summarize latest BILLING updates","userId":"dev-user-1","mode":"erp"}' \
  http://localhost:3000/api/ai/chat
```

## Tests
```
npm run test
```

## Notes
- Embeddings stored as JSON arrays in `Embedding.vector`.
- Guardrail: If prompt asks about modules outside allowedModules, the assistant must reply:
  "Sorry, that module is not available for your role."
- Production: switch DB to Postgres, store uploads on S3, and consider a vector DB.
