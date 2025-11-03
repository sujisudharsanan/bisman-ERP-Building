// Local model adapter using Ollama if available, else a simple mock.
export class LocalModelAdapter {
  private ollamaHost: string;
  private model: string;
  private useProxy: boolean;

  constructor() {
  this.ollamaHost = process.env.NEXT_PUBLIC_OLLAMA_URL || process.env.OLLAMA_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
  this.model = process.env.NEXT_PUBLIC_OLLAMA_MODEL || process.env.OLLAMA_MODEL || 'llama3:8b';
  const isNgrok = /ngrok(-free)?\.(dev|io)/i.test(this.ollamaHost);
  const forceProxyEnv = String(process.env.OLLAMA_FORCE_PROXY || '').toLowerCase() === 'true';
  // Force proxy when using ngrok to bypass CORS/403 on Ollama 0.1.32
  this.useProxy = isNgrok || forceProxyEnv;
  }

  async generate(prompt: string): Promise<string> {
    try {
      // If running in the browser and NEXT_PUBLIC_OLLAMA_URL not set, use server relay
  const inBrowser = typeof window !== 'undefined';
  const hasPublic = !!process.env.NEXT_PUBLIC_OLLAMA_URL;
  const viaProxy = this.useProxy || (inBrowser && !hasPublic);
  const url = viaProxy ? '/api/ai/ollama' : `${this.ollamaHost}/api/generate`;
  const payload = viaProxy ? { op: 'generate', model: this.model, prompt } : { model: this.model, prompt, stream: false };
      const addNgrok = /ngrok(-free)?\.(dev|io)/i.test(url) || String(process.env.NGROK_BYPASS || '').toLowerCase() === 'true';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(addNgrok ? { 'ngrok-skip-browser-warning': 'true' } : {}) },
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
  const viaProxy = this.useProxy || (inBrowser && !hasPublic);
  const url = viaProxy ? '/api/ai/ollama' : `${this.ollamaHost}/api/embeddings`;
  const payload = viaProxy ? { op: 'embed', model: this.model, text } : { model: this.model, prompt: text };
      const addNgrok = /ngrok(-free)?\.(dev|io)/i.test(url) || String(process.env.NGROK_BYPASS || '').toLowerCase() === 'true';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(addNgrok ? { 'ngrok-skip-browser-warning': 'true' } : {}) },
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
