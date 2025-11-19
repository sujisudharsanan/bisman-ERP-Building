export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function safeFetch(input: RequestInfo | URL, options: SafeFetchOptions = {}) {
  const { timeoutMs = 15000, signal, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const composite = signal
    ? new AbortController()
    : controller;
  if (signal && composite !== controller) {
    signal.addEventListener('abort', () => composite.abort());
  }
  try {
    return await fetch(input, { ...rest, signal: composite.signal, credentials: rest.credentials || 'include' });
  } finally {
    clearTimeout(timeout);
  }
}
