// OpenAI-compatible API adapter.
// Uses server env when on server; on client, calls a secure Next.js relay.
export class ApiModelAdapter {
  private baseUrl: string;
  private apiKey?: string;
  private chatModel: string;
  private embedModel: string;

  constructor() {
    this.baseUrl = process.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
    this.apiKey = process.env.AI_API_KEY;
    this.chatModel = process.env.AI_MODEL || 'gpt-4o-mini';
    this.embedModel = process.env.AI_EMBED_MODEL || 'text-embedding-3-small';
  }

  async generate(prompt: string): Promise<string> {
    // If running in the browser, go through our relay to avoid exposing keys.
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/ai/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'chat', prompt })
      });
      if (!res.ok) throw new Error(`relay_${res.status}`);
      const data = await res.json();
      return data?.content || '';
    }

    // Server-side: call provider directly (OpenAI-compatible schema)
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.chatModel,
        messages: [
          { role: 'system', content: 'You are a helpful ERP assistant. Be concise and accurate.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`api_${res.status}:${t.slice(0, 120)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return content;
  }

  async embed(text: string): Promise<number[]> {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/ai/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'embed', text })
      });
      if (!res.ok) throw new Error(`relay_${res.status}`);
      const data = await res.json();
      return data?.embedding || [];
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.embedModel,
        input: text
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`api_${res.status}:${t.slice(0, 120)}`);
    }
    const data = await res.json();
    const vec = data?.data?.[0]?.embedding || [];
    return vec;
  }
}
