// Simple client-side usage log forwarder to API for audit
export async function saveUsage(entry: { userId: any; action: string; input: any; output: any }) {
  try {
    await fetch('/api/ai/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(entry)
    });
  } catch {}
}
