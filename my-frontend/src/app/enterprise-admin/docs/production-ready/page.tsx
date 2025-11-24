import fs from 'fs';
import path from 'path';
import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export default async function ProductionReadyGuidePage() {
  const filePath = path.join(process.cwd(), 'PRODUCTION_READY_GUIDE_UPDATED.md');
  let content = 'Guide not found.';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    content = 'Failed to read production guide.';
  }
  const rawHtml = marked.parse(content, { async: false });
  const html = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Production Readiness Guide</h1>
      <p className="text-sm text-gray-500 mb-6">Rendered from repository file `PRODUCTION_READY_GUIDE_UPDATED.md`.</p>
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
