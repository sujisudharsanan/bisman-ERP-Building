import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
  const file = formData.get('file') as File | null;
    const owner_type = String(formData.get('owner_type') || 'unknown');
    const owner_id = String(formData.get('owner_id') || 'unknown');

    if (!file) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    // Basic validation
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'file too large' }, { status: 413 });
    }
    const allowed = ['image/', 'application/pdf'];
    const ct = file.type || '';
    if (!allowed.some(prefix => ct.startsWith(prefix))) {
      return NextResponse.json({ error: 'unsupported file type' }, { status: 415 });
    }

    // NOTE: This is a dev stub. In production, forward to backend for presigned upload.
    const id = `${owner_type}-${Date.now()}`;
  const meta = {
      id,
      owner_type,
      owner_id,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      size_bytes: file.size || 0,
      status:
        owner_type === 'kyc' ? ('pending-approval' as const) : ('active' as const),
    };
    return NextResponse.json(meta);
  } catch (e) {
    return NextResponse.json({ error: 'upload failed' }, { status: 500 });
  }
}
