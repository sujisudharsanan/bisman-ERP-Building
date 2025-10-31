// Local model adapter using Ollama if available, else a simple mock.
export class LocalModelAdapter {
  private ollamaHost: string;
  private model: string;

  constructor() {
  this.ollamaHost = process.env.NEXT_PUBLIC_OLLAMA_URL || process.env.OLLAMA_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
  this.model = process.env.NEXT_PUBLIC_OLLAMA_MODEL || process.env.OLLAMA_MODEL || 'llama3:8b';
  }

  async generate(prompt: string): Promise<string> {
    try {
      // If running in the browser and NEXT_PUBLIC_OLLAMA_URL not set, use server relay
      const inBrowser = typeof window !== 'undefined';
      const hasPublic = !!process.env.NEXT_PUBLIC_OLLAMA_URL;
      const url = inBrowser && !hasPublic ? '/api/ai/ollama' : `${this.ollamaHost}/api/generate`;
      const payload = inBrowser && !hasPublic ? { op: 'generate', model: this.model, prompt } : { model: this.model, prompt, stream: false };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = await res.json();
      return data.response || data?.response || data?.content || '';
    } catch (e) {
      return `[[local-ai-fallback]] ${prompt.slice(0, 200)}`;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const inBrowser = typeof window !== 'undefined';
      const hasPublic = !!process.env.NEXT_PUBLIC_OLLAMA_URL;
      const url = inBrowser && !hasPublic ? '/api/ai/ollama' : `${this.ollamaHost}/api/embeddings`;
      const payload = inBrowser && !hasPublic ? { op: 'embed', model: this.model, text } : { model: this.model, prompt: text };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = await res.json();
      return data.embeddings?.[0] || data.embedding || [];
    } catch (e) {
      // Produce a deterministic tiny embedding fallback
      const arr = new Array(16).fill(0).map((_, i) => ((text.charCodeAt(i % text.length) || 0) % 97) / 97);
      return arr;
    }
  }
}
