// Local adapter now forwards to common ai client (railway/open-webui) so we can remove Ollama-specific code.
import { callChat, getEmbedding } from '@/lib/aiClient';

export class LocalModelAdapter {
  constructor() {}

  async generate(prompt: string): Promise<string> {
    try {
      // reuse the aiClient which uses the Railway client or configured AI_BASE_URL
      const message = await callChat([{ role: 'user', content: prompt }]);
      return message || '';
    } catch (e) {
      return `[[local-ai-fallback]] ${prompt.slice(0, 200)}`;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const vec = await getEmbedding(text);
      return vec;
    } catch (e) {
      // deterministic fallback to avoid hard crashes
      const arr = new Array(16).fill(0).map((_, i) => ((text.charCodeAt(i % text.length) || 0) % 97) / 97);
      return arr;
    }
  }
}
