import fs from 'fs';
import path from 'path';
import React from 'react';

export default async function ProductionReadyGuidePage() {
  const filePath = path.join(process.cwd(), 'PRODUCTION_READY_GUIDE_UPDATED.md');
  let content = 'Guide not found.';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    content = 'Failed to read production guide.';
  }
  const markedMod: any = await import('marked');
  const parseFn = markedMod?.marked?.parse || markedMod?.parse || markedMod?.default?.parse;
  const rawHtml = parseFn ? parseFn(content) : content;
  const domPurifyMod: any = await import('isomorphic-dompurify');
  const sanitizer: (h: string, o?: any) => string = (domPurifyMod && (domPurifyMod.default?.sanitize || domPurifyMod.sanitize)) as any;
  const html: string = sanitizer ? sanitizer(String(rawHtml), { USE_PROFILES: { html: true } }) : String(rawHtml);
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Production Readiness Guide</h1>
      <p className="text-sm text-gray-500 mb-6">Rendered from repository file `PRODUCTION_READY_GUIDE_UPDATED.md`.</p>
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
