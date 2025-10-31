/**
 * Ollama client wrappers for chat and embeddings.
 * Tries /v1 endpoints first, falls back to legacy /api.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(messages: ChatMessage[], model = DEFAULT_MODEL): Promise<string> {
  // Try OpenAI-style /v1 endpoint
  try {
    const r = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
    });
    if (r.ok) {
      const j: any = await r.json();
      const content = j?.choices?.[0]?.message?.content;
      if (content) return content;
    }
  } catch {}
  // Fallback to /api/chat
  const r2 = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (!r2.ok) throw new Error(`ollama_chat_${r2.status}`);
  const j2: any = await r2.json();
  return j2?.message?.content || '';
}

export async function getEmbedding(input: string, model = DEFAULT_MODEL): Promise<number[]> {
  // Try OpenAI-style /v1/embeddings
  try {
    const r = await fetch(`${OLLAMA_URL}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input }),
    });
    if (r.ok) {
      const j: any = await r.json();
      const vec = j?.data?.[0]?.embedding;
      if (Array.isArray(vec)) return vec;
    }
  } catch {}
  // Fallback to /api/embeddings
  const r2 = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: input }),
  });
  if (!r2.ok) throw new Error(`ollama_embed_${r2.status}`);
  const j2: any = await r2.json();
  const vec = j2?.embedding;
  if (!Array.isArray(vec)) throw new Error('embedding_format_error');
  return vec;
}
