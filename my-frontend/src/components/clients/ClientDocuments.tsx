"use client";
import React, { useState } from 'react';
import API_BASE from '@/config/api';
import { uploadFiles } from '@/lib/attachments';
import { RefreshCw, UploadCloud } from 'lucide-react';

interface DocMeta {
  id: string;
  filename: string;
  url: string;
  size_bytes?: number;
  content_type?: string;
  doc_type?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

interface Props {
  clientId: string;
  existing?: DocMeta[];
  onAdded?: (doc: DocMeta) => void;
}

export default function ClientDocuments({ clientId, existing = [], onAdded }: Props) {
  const [docs, setDocs] = useState<DocMeta[]>(existing);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState('GENERAL');

  async function handleUpload() {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      // First upload raw files (assuming /api/attachments/complete stores and returns file metadata including maybe a path)
      const selected = Array.from(files);
      const uploaded = await uploadFiles(selected, 'kyc', clientId);
      for (const meta of uploaded) {
        const body = {
          filename: meta.filename,
          url: `/api/secure-files/${encodeURIComponent(meta.id)}`,
          size_bytes: meta.size_bytes,
          content_type: meta.content_type,
          doc_type: docType,
        };
        const res = await fetch(`${API_BASE}/api/system/clients/${encodeURIComponent(clientId)}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to persist document');
        setDocs((d) => [...d, json.data]);
        if (onAdded) onAdded(json.data);
      }
      setFiles(null);
      alert('Documents uploaded');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Client Documents</h3>
        <div className="flex items-center gap-2">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border rounded p-1 text-sm">
            <option value="GENERAL">General</option>
            <option value="KYC">KYC</option>
            <option value="CONTRACT">Contract</option>
            <option value="INVOICE">Invoice</option>
          </select>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" />
          <button onClick={handleUpload} disabled={loading || !files?.length} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded flex items-center">
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />} Upload
          </button>
        </div>
      </div>
      {docs.length === 0 && <p className="text-sm text-gray-500">No documents uploaded yet.</p>}
      {docs.length > 0 && (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-1 text-left">Filename</th>
              <th className="border px-2 py-1 text-left">Type</th>
              <th className="border px-2 py-1 text-left">Size</th>
              <th className="border px-2 py-1 text-left">Uploaded</th>
              <th className="border px-2 py-1 text-left">By</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="hover:bg-gray-100">
                <td className="border px-2 py-1"><a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{d.filename}</a></td>
                <td className="border px-2 py-1">{d.doc_type || 'GENERAL'}</td>
                <td className="border px-2 py-1">{d.size_bytes ? `${Math.round(d.size_bytes/1024)} KB` : '-'}</td>
                <td className="border px-2 py-1">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : '-'}</td>
                <td className="border px-2 py-1">{d.uploaded_by || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
