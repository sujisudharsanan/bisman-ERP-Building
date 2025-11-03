/**
 * Ollama client wrappers (native API) for chat and embeddings.
 * Compatible with Ollama 0.1.32: uses /api/chat and /api/embeddings only.
 */

const OLLAMA_URL = (process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3:latest';
const NGROK_BYPASS = String(process.env.NGROK_BYPASS || '').toLowerCase() === 'true';
const isNgrok = /ngrok(-free)?\.(dev|io)/i.test(OLLAMA_URL);
const PREFER_GENERATE = String(process.env.OLLAMA_PREFER_GENERATE || '').toLowerCase() === 'true';

function withNgrokHeaders(base: Record<string, string>): Record<string, string> {
  if (isNgrok || NGROK_BYPASS) {
    return {
      ...base,
      'ngrok-skip-browser-warning': 'true',
    };
  }
  return base;
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(messages: ChatMessage[], model = DEFAULT_MODEL): Promise<string> {
  // If configured, skip /api/chat entirely and use /api/generate for compatibility
  if (PREFER_GENERATE) {
    const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const rg = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: withNgrokHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!rg.ok) throw new Error(`ollama_generate_${rg.status}`);
    const jg: any = await rg.json();
    return jg?.response || jg?.content || '';
  }

  // Default: try /api/chat first
  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: withNgrokHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (r.ok) {
    const j: any = await r.json();
    return j?.message?.content || j?.content || '';
  }
  // Fallback for older/limited builds: synthesize a prompt and use /api/generate
  if (r.status === 404 || r.status === 405) {
    const prompt = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');
    const rg = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: withNgrokHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!rg.ok) throw new Error(`ollama_generate_${rg.status}`);
    const jg: any = await rg.json();
    return jg?.response || jg?.content || '';
  }
  throw new Error(`ollama_chat_${r.status}`);
}

export async function getEmbedding(input: string, model = DEFAULT_MODEL): Promise<number[]> {
  const r = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: withNgrokHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
    body: JSON.stringify({ model, prompt: input }),
  });
  if (!r.ok) throw new Error(`ollama_embed_${r.status}`);
  const j: any = await r.json();
  // Some versions return { embedding }, others { embeddings: [[...]] }
  const vec = j?.embedding || j?.embeddings?.[0];
  if (!Array.isArray(vec)) throw new Error('embedding_format_error');
  return vec as number[];
}
