import React from 'react'

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000'

async function fetchStats() {
  try {
    const res = await fetch(`${BACKEND_BASE.replace(/\/$/, '')}/api/admin/contracts/stats`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    return null
  }
}

async function fetchContracts(page = 1, limit = 20) {
  try {
    const url = new URL(`${BACKEND_BASE.replace(/\/$/, '')}/api/admin/contracts`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(limit))
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    return null
  }
}

export default async function ContractsPage() {
  const [statsRes, contractsRes] = await Promise.all([fetchStats(), fetchContracts(1, 25)])
  const stats = statsRes?.data || null
  const contracts = contractsRes?.data?.contracts || []

  return (
    <div className="p-6">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Contracts & Agreements</h1>
          <p className="text-sm text-gray-500">Centralized contract lifecycle and compliance management</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-violet-600 text-white rounded">+ Create Contract</button>
          <button className="px-3 py-2 border rounded">Export</button>
          <button className="px-3 py-2 border rounded">Filters</button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow-sm">
          <p className="text-sm text-gray-500">Total Active Contracts</p>
          <p className="text-2xl font-semibold">{stats ? stats.total_active : '—'}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <p className="text-sm text-gray-500">Expiring in 30 days</p>
          <p className="text-2xl font-semibold">{stats ? stats.expiring_in_30_days : '—'}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <p className="text-sm text-gray-500">Total Monthly Commitment</p>
          <p className="text-2xl font-semibold">{stats ? `₹ ${stats.monthly_commitment?.toLocaleString?.() ?? stats.monthly_commitment}` : '—'}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <p className="text-sm text-gray-500">Advance Amount Locked</p>
          <p className="text-2xl font-semibold">{stats ? `₹ ${stats.advance_locked?.toLocaleString?.() ?? stats.advance_locked}` : '—'}</p>
        </div>
      </section>

      {/* Contracts Table */}
      <section className="bg-white rounded shadow-sm p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-2">Contract #</th>
                <th className="p-2">Type</th>
                <th className="p-2">Party</th>
                <th className="p-2">Start</th>
                <th className="p-2">Expiry</th>
                <th className="p-2">Status</th>
                <th className="p-2">Monthly Value</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">No contracts found</td>
                </tr>
              )}
              {contracts.map((c: any) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 align-top">{c.contract_number || c.id}</td>
                  <td className="p-2 align-top">{c.contract_type}</td>
                  <td className="p-2 align-top">{c.party_name}</td>
                  <td className="p-2 align-top">{new Date(c.start_date).toLocaleDateString()}</td>
                  <td className="p-2 align-top">
                    <div className="flex items-center gap-2">
                      <span>{new Date(c.end_date).toLocaleDateString()}</span>
                      {typeof c.days_until_expiry === 'number' && (
                        <span className={`px-2 py-0.5 text-xs rounded ${c.days_until_expiry < 0 ? 'bg-red-100 text-red-700' : c.days_until_expiry < 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {c.days_until_expiry < 0 ? 'Expired' : `${c.days_until_expiry}d`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 align-top">{c.status}</td>
                  <td className="p-2 align-top">{c.monthly_value ? `₹ ${Number(c.monthly_value).toLocaleString()}` : '—'}</td>
                  <td className="p-2 align-top">
                    <div className="flex items-center gap-2">
                      <a className="text-sm text-violet-600 hover:underline" href={`/admin/contracts/${c.id}`}>View</a>
                      <a className="text-sm text-gray-600 hover:underline" href={`/admin/contracts/${c.id}/edit`}>Edit</a>
                      <form method="post" action={`/api/admin/contracts/${c.id}/status`} className="inline">
                        <button type="submit" name="action" value="terminate" className="text-sm text-red-600 hover:underline">Terminate</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
