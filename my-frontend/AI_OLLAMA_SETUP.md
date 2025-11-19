# Ollama integration (local + Railway)

Local dev
- OLLAMA_URL=http://localhost:11434
- OLLAMA_FORCE_PROXY=true
- OLLAMA_PREFER_GENERATE=true
- OLLAMA_MODEL=tinyllama:latest
- NEXT_PUBLIC_OLLAMA_MODEL=tinyllama:latest
- Keep NEXT_PUBLIC_OLLAMA_URL unset (browser uses server relay).

Railway (set on service, not in repo)
- OLLAMA_URL=http://ollama.railway.internal:11434
- OLLAMA_FORCE_PROXY=true
- OLLAMA_PREFER_GENERATE=true
- OLLAMA_MODEL=tinyllama:latest
- NEXT_PUBLIC_OLLAMA_MODEL=tinyllama:latest
- Do NOT set NEXT_PUBLIC_OLLAMA_URL.

Health check
- GET /api/ai/health → verifies OLLAMA_URL /api/tags accessibility.

Troubleshooting
- 404 on /api/generate → model missing. Pull it on the Ollama host.
- 502 from /api/ai/ollama → service cannot reach OLLAMA_URL. Confirm internal URL and project network.
