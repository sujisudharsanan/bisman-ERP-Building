// Local model adapter using Ollama if available, else a simple mock.
export class LocalModelAdapter {
  private ollamaHost: string;
  private model: string;

  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3:8b';
  }

  async generate(prompt: string): Promise<string> {
    try {
      const res = await fetch(`${this.ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt, stream: false })
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = await res.json();
      return data.response || '';
    } catch (e) {
      return `[[local-ai-fallback]] ${prompt.slice(0, 200)}`;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const res = await fetch(`${this.ollamaHost}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text })
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = await res.json();
      return data.embeddings?.[0] || [];
    } catch (e) {
      // Produce a deterministic tiny embedding fallback
      const arr = new Array(16).fill(0).map((_, i) => ((text.charCodeAt(i % text.length) || 0) % 97) / 97);
      return arr;
    }
  }
}
