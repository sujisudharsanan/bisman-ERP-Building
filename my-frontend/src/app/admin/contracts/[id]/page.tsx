import React from 'react'

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000'

async function fetchContract(id: string) {
  try {
    const res = await fetch(`${BACKEND_BASE.replace(/\/$/, '')}/api/admin/contracts/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    return null
  }
}

export default async function ContractDetails({ params }: { params: { id: string } }) {
  const id = params.id
  const json = await fetchContract(id)
  const c = json?.data || null

  if (!c) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Contract not found</h2>
        <p className="text-sm text-gray-500">No contract with id {id}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{c.contract_number || c.id}</h1>
          <p className="text-sm text-gray-500">{c.contract_type} — {c.party_name}</p>
        </div>
        <div className="flex gap-2">
          <a className="px-3 py-2 border rounded" href={`/admin/contracts/${c.id}/edit`}>Edit</a>
          <a className="px-3 py-2 border rounded" href="#documents">Documents</a>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow-sm">
          <p className="text-sm text-gray-500">Start Date</p>
          <p className="font-medium">{new Date(c.start_date).toLocaleDateString()}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <p className="text-sm text-gray-500">End Date</p>
          <p className="font-medium">{new Date(c.end_date).toLocaleDateString()}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-medium">{c.status}</p>
        </div>
      </section>

      <section className="bg-white p-4 rounded shadow-sm mb-6">
        <h3 className="font-semibold mb-2">Financials</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm text-gray-500">Monthly Value</p>
            <p className="font-medium">{c.monthly_value ? `₹ ${Number(c.monthly_value).toLocaleString()}` : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Advance</p>
            <p className="font-medium">{c.advance_amount ? `₹ ${Number(c.advance_amount).toLocaleString()}` : '—'}</p>
          </div>
        </div>
      </section>

      <section id="documents" className="bg-white p-4 rounded shadow-sm">
        <h3 className="font-semibold mb-2">Documents</h3>
        {Array.isArray(c.documents) && c.documents.length > 0 ? (
          <ul className="space-y-2">
            {c.documents.map((d: any) => (
              <li key={d.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.filename}</div>
                  <div className="text-xs text-gray-500">{d.content_type} • {new Date(d.uploaded_at).toLocaleString()}</div>
                </div>
                <a className="text-violet-600 hover:underline" href={d.url || '#'} target="_blank">Download</a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No documents attached.</p>
        )}
      </section>
    </div>
  )
}
