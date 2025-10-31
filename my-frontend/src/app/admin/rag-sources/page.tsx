import { prisma } from '@/lib/prisma';

type RagRow = { id: string; fileName: string; path: string; tags: string[]; embeddingStatus: string; createdAt: Date };
export default async function RAGSourcesPage() {
  const list = await (prisma as any).ragSource.findMany({ orderBy: { createdAt: 'desc' } }) as RagRow[];
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">RAG Sources</h1>
      <div className="mb-4 text-sm text-gray-600">Upload endpoint coming soon. Reindex button will appear next.</div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="p-2 text-left">File</th>
            <th className="p-2 text-left">Tags</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Uploaded</th>
          </tr></thead>
          <tbody>
            {list.map((s: RagRow) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.fileName}</td>
                <td className="p-2">{s.tags.join(', ')}</td>
                <td className="p-2">{s.embeddingStatus}</td>
                <td className="p-2">{s.createdAt.toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
