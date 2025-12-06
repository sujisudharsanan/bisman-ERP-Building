/*
  Railway AI client
  - Calls `${AI_BASE_URL}/api/generate`
  - Secure header: `x-ai-key: <AI_KEY>` when provided
  - Timeout + 3 retries (exp backoff)
  - Returns unified { answer: string }
  - Structure prepared for streaming (TODO)
*/

export type GenerateParams = {
  prompt: string;
  model?: string; // default 'llama3'
  stream?: false; // reserved for future streaming true
  timeoutMs?: number; // default 30000
};

export type GenerateResult = {
  answer: string;
  raw?: any;
};

const AI_BASE_URL = (process.env.AI_BASE_URL || '').replace(/\/$/, '');
const AI_KEY = process.env.AI_KEY || '';

function ensureConfig() {
  if (!AI_BASE_URL) {
    throw new Error('ai_base_url_missing');
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    // @ts-ignore augment init later
    const r = await p;
    return r;
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function generateCompletion({ prompt, model = 'llama3', stream = false, timeoutMs = 30000 }: GenerateParams): Promise<GenerateResult> {
  ensureConfig();
  const url = `${AI_BASE_URL}/api/generate`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (AI_KEY) headers['x-ai-key'] = AI_KEY;

  const body = JSON.stringify({ model, prompt, stream });

  const maxAttempts = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        // Retry on 429/5xx
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < maxAttempts) {
          await sleep(250 * attempt);
          continue;
        }
        const text = await res.text().catch(() => '');
        throw new Error(`ai_http_${res.status}:${text.slice(0, 200)}`);
      }
      const json: any = await res.json().catch(() => ({}));
      const answer = json?.response || json?.content || json?.answer || '';
      return { answer, raw: json };
    } catch (e: any) {
      lastErr = e;
      // Retry on abort/network only if attempts remain
      if (attempt < maxAttempts) {
        await sleep(250 * attempt);
        continue;
      }
    }
  }
  throw lastErr || new Error('ai_failed');
}

// TODO: streaming support
// export async function streamCompletion(...) { /* placeholder */ }
