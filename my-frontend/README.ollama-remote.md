Remote Ollama setup

1) In your shell or .env.local set:

   OLLAMA_URL=https://ned-throatless-secondarily.ngrok-free.dev
   OLLAMA_MODEL=llama3:latest

2) Start the frontend normally. The chat widget uses /api/ai/chat → lib/ollama.ts, which reads OLLAMA_URL.

3) Verify connectivity:
   - Open /api/ai/chat in the Network tab when sending a message.
   - You should see requests to your ngrok URL (/v1/chat/completions or /api/chat).

Note: If your ngrok agent sleeps, the first request may 502. Re-run and confirm curl to /api/tags works.
