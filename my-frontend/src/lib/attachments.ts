export type AttachmentOwner = 'chat' | 'avatar' | 'kyc' | 'expense';

export type AttachmentMeta = {
  id: string;
  owner_type: AttachmentOwner;
  owner_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: 'uploading' | 'active' | 'pending-approval' | 'approved' | 'quarantined' | 'deleted';
};

export async function uploadFiles(
  files: File[],
  ownerType: AttachmentOwner,
  ownerId: string,
  extra?: Record<string, string>
): Promise<AttachmentMeta[]> {
  const results: AttachmentMeta[] = [];
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('owner_type', ownerType);
    fd.append('owner_id', ownerId);
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    }
    // Use a simple complete endpoint that accepts multipart form-data
    const res = await fetch('/api/attachments/complete', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Upload failed');
    const meta = (await res.json()) as AttachmentMeta;
    results.push(meta);
  }
  return results;
}
