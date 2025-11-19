import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const backend = process.env.BACKEND_API_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (backend) {
    try {
      await fetch(`${backend.replace(/\/$/, '')}/api/integrations/tawk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // swallow errors to avoid retries storm on Tawk side
    }
  }

  return NextResponse.json({ ok: true });
}
