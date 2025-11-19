import { generateCompletion } from '@/services/ai/railwayClient';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(messages: ChatMessage[], model?: string) {
  const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const resp = await generateCompletion({ prompt, model: model || undefined });
  return resp.answer || '';
}

export async function getEmbedding(input: string, model?: string) {
  // Railway/Open WebUI may not support embeddings; if not available, throw a clear error
  // For now, attempt to call /api/generate with a 'embedding' hint and expect a numeric array in response.raw.embedding
  const resp = await generateCompletion({ prompt: input, model: model || undefined });
  const raw = resp.raw || {};
  const vec = raw?.embedding || raw?.embeddings?.[0] || raw?.response_embedding;
  if (!Array.isArray(vec)) throw new Error('embeddings_not_supported');
  return vec as number[];
}

export default { callChat, getEmbedding };
