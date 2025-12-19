'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Types
interface Contract {
  id: string
  contract_number: string
  contract_type: string
  party_name: string
  party_contact?: string
  party_address?: string
  start_date: string
  end_date: string
  monthly_value?: number
  advance_amount?: number
  security_deposit?: number
  escalation_percent?: number
  payment_day?: number
  status: string
  terms?: string
  custom_fields?: Record<string, any>
  created_at: string
  updated_at: string
  documents?: ContractDocument[]
  activities?: Activity[]
}

interface ContractDocument {
  id: string
  filename: string
  content_type: string
  url?: string
  uploaded_at: string
  uploaded_by?: string
}

interface Activity {
  id: string
  action: string
  performed_by: string
  timestamp: string
  details?: string
}

interface ScheduledPayable {
  id: string
  due_date: string
  amount: number
  status: string
  posted_at?: string
  paid_at?: string
}

interface JournalEntry {
  id: string
  entry_date: string
  description: string
  total_debit: number
  total_credit: number
  lines: JournalLine[]
}

interface JournalLine {
  ledger_name: string
  debit: number
  credit: number
}

interface LedgerView {
  mapping?: {
    expense_ledger_id: string
    liability_ledger_id: string
    advance_ledger_id?: string
    activated_at: string
  }
  payables: ScheduledPayable[]
  journals: JournalEntry[]
  summary: {
    total_scheduled: number
    total_paid: number
    total_pending: number
    advance_balance: number
  }
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-yellow-100 text-yellow-700',
    TERMINATED: 'bg-red-100 text-red-700',
    RENEWED: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

// Tab component
const TABS = ['Overview', 'Financials', 'Documents', 'Activity', 'Accounting'] as const
type TabType = typeof TABS[number]

export default function ContractDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [ledgerView, setLedgerView] = useState<LedgerView | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('Overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch contract details
  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/contracts/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch contract')
      const json = await res.json()
      setContract(json.data || json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch ledger view (accounting data)
  const fetchLedgerView = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/finance/contracts/${id}/ledger-view`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setLedgerView(json.data || json)
      }
    } catch (e) {
      // Accounting may not be activated yet
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchContract()
      fetchLedgerView()
    }
  }, [id, fetchContract, fetchLedgerView])

  // Action handlers
  const handleActivateAccounting = async () => {
    setActionLoading('activate')
    try {
      const res = await fetch(`${API_BASE}/api/finance/contracts/${id}/activate-accounting`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_ledger_id: 'default-expense',
          liability_ledger_id: 'default-liability',
        }),
      })
      if (!res.ok) throw new Error('Failed to activate accounting')
      await fetchLedgerView()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleGeneratePayables = async () => {
    setActionLoading('generate')
    try {
      const res = await fetch(`${API_BASE}/api/finance/contracts/${id}/generate-payables`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to generate payables')
      await fetchLedgerView()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePostPayable = async (payableId: string) => {
    setActionLoading(`post-${payableId}`)
    try {
      const res = await fetch(`${API_BASE}/api/finance/contracts/${id}/payables/${payableId}/post`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to post payable')
      await fetchLedgerView()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePayPayable = async (payableId: string) => {
    setActionLoading(`pay-${payableId}`)
    try {
      const res = await fetch(`${API_BASE}/api/finance/contracts/${id}/payables/${payableId}/pay`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ref: `PAY-${Date.now()}` }),
      })
      if (!res.ok) throw new Error('Failed to record payment')
      await fetchLedgerView()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleTerminate = async () => {
    if (!confirm('Are you sure you want to terminate this contract?')) return
    setActionLoading('terminate')
    try {
      const res = await fetch(`${API_BASE}/api/admin/contracts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'TERMINATED' }),
      })
      if (!res.ok) throw new Error('Failed to terminate contract')
      await fetchContract()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!contract) return null
    const end = new Date(contract.end_date)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-red-600">Contract not found</h2>
        <p className="text-sm text-gray-500">{error || `No contract with id ${id}`}</p>
        <Link href="/admin/contracts" className="mt-4 inline-block text-violet-600 hover:underline">
          ← Back to Contracts
        </Link>
      </div>
    )
  }

  const daysUntilExpiry = getDaysUntilExpiry()
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{contract.contract_number || `Contract #${contract.id.slice(0, 8)}`}</h1>
            <StatusBadge status={contract.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {contract.contract_type} — {contract.party_name}
          </p>
          {isExpiringSoon && (
            <p className="text-sm text-amber-600 mt-1 font-medium">
              ⚠️ Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/admin/contracts/${contract.id}/edit`}
            className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition"
          >
            Edit
          </Link>
          {contract.status === 'ACTIVE' && (
            <>
              <button
                onClick={() => router.push(`/admin/contracts/create?renew=${contract.id}`)}
                className="px-4 py-2 border border-violet-600 text-violet-600 rounded hover:bg-violet-50 transition"
              >
                Renew
              </button>
              <button
                onClick={handleTerminate}
                disabled={actionLoading === 'terminate'}
                className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 transition disabled:opacity-50"
              >
                {actionLoading === 'terminate' ? 'Terminating...' : 'Terminate'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'Overview' && (
          <OverviewTab contract={contract} daysUntilExpiry={daysUntilExpiry} />
        )}
        {activeTab === 'Financials' && (
          <FinancialsTab contract={contract} ledgerView={ledgerView} />
        )}
        {activeTab === 'Documents' && (
          <DocumentsTab contract={contract} onRefresh={fetchContract} />
        )}
        {activeTab === 'Activity' && (
          <ActivityTab contract={contract} />
        )}
        {activeTab === 'Accounting' && (
          <AccountingTab
            contract={contract}
            ledgerView={ledgerView}
            onActivate={handleActivateAccounting}
            onGeneratePayables={handleGeneratePayables}
            onPostPayable={handlePostPayable}
            onPayPayable={handlePayPayable}
            actionLoading={actionLoading}
          />
        )}
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTab({ contract, daysUntilExpiry }: { contract: Contract; daysUntilExpiry: number | null }) {
  return (
    <div className="space-y-6">
      {/* Key Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard label="Contract Type" value={contract.contract_type} />
        <InfoCard label="Party Name" value={contract.party_name} />
        <InfoCard label="Status" value={<StatusBadge status={contract.status} />} />
        <InfoCard
          label="Days Until Expiry"
          value={
            daysUntilExpiry !== null
              ? daysUntilExpiry > 0
                ? `${daysUntilExpiry} days`
                : 'Expired'
              : '—'
          }
        />
      </div>

      {/* Dates */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Contract Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard label="Start Date" value={new Date(contract.start_date).toLocaleDateString()} />
          <InfoCard label="End Date" value={new Date(contract.end_date).toLocaleDateString()} />
          <InfoCard
            label="Duration"
            value={`${Math.ceil(
              (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) /
                (1000 * 60 * 60 * 24 * 30)
            )} months`}
          />
        </div>
      </div>

      {/* Party Details */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Party Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard label="Contact" value={contract.party_contact || '—'} />
          <InfoCard label="Address" value={contract.party_address || '—'} />
        </div>
      </div>

      {/* Terms */}
      {contract.terms && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Terms & Conditions</h3>
          <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">{contract.terms}</div>
        </div>
      )}

      {/* Custom Fields */}
      {contract.custom_fields && Object.keys(contract.custom_fields).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(contract.custom_fields).map(([key, value]) => (
              <InfoCard key={key} label={key.replace(/_/g, ' ')} value={String(value)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Financials Tab
function FinancialsTab({ contract, ledgerView }: { contract: Contract; ledgerView: LedgerView | null }) {
  const monthlyValue = contract.monthly_value || 0
  const advance = contract.advance_amount || 0
  const securityDeposit = contract.security_deposit || 0

  // Calculate totals from ledger view if available
  const totalScheduled = ledgerView?.summary.total_scheduled || 0
  const totalPaid = ledgerView?.summary.total_paid || 0
  const totalPending = ledgerView?.summary.total_pending || totalScheduled - totalPaid
  const advanceBalance = ledgerView?.summary.advance_balance || advance

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-violet-50 p-4 rounded-lg">
          <p className="text-sm text-violet-600">Monthly Value</p>
          <p className="text-2xl font-bold">₹{monthlyValue.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Total Paid</p>
          <p className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-sm text-amber-600">Pending</p>
          <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600">Advance Balance</p>
          <p className="text-2xl font-bold">₹{advanceBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Contract Financial Terms */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Financial Terms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard label="Security Deposit" value={`₹${securityDeposit.toLocaleString()}`} />
          <InfoCard label="Payment Day" value={contract.payment_day ? `Day ${contract.payment_day}` : '—'} />
          <InfoCard label="Escalation %" value={contract.escalation_percent ? `${contract.escalation_percent}%` : '—'} />
          <InfoCard label="Total Contract Value" value={`₹${totalScheduled.toLocaleString()}`} />
        </div>
      </div>

      {/* Payment Schedule */}
      {ledgerView?.payables && ledgerView.payables.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Payment Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Due Date</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-center py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Posted</th>
                  <th className="text-left py-2 px-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {ledgerView.payables.slice(0, 12).map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{new Date(p.due_date).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-right">₹{p.amount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          p.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : p.status === 'POSTED'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {p.posted_at ? new Date(p.posted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Documents Tab
function DocumentsTab({ contract, onRefresh }: { contract: Contract; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/contracts/${contract.id}/documents`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      )
      if (!res.ok) throw new Error('Upload failed')
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="flex items-center gap-4">
        <label className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 cursor-pointer transition">
          {uploading ? 'Uploading...' : 'Upload Document'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <span className="text-sm text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 10MB</span>
      </div>

      {/* Documents List */}
      {contract.documents && contract.documents.length > 0 ? (
        <div className="grid gap-3">
          {contract.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded flex items-center justify-center">
                  <span className="text-violet-600 text-xs font-medium">
                    {doc.content_type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{doc.filename}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.uploaded_at).toLocaleString()}
                    {doc.uploaded_by && ` • by ${doc.uploaded_by}`}
                  </p>
                </div>
              </div>
              <a
                href={doc.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm text-violet-600 hover:underline"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>No documents attached yet.</p>
          <p className="text-sm">Upload contract documents, amendments, or supporting files.</p>
        </div>
      )}
    </div>
  )
}

// Activity Tab
function ActivityTab({ contract }: { contract: Contract }) {
  const activities = contract.activities || []

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 mt-2 bg-violet-600 rounded-full" />
              <div className="flex-1">
                <p className="font-medium">{activity.action}</p>
                {activity.details && <p className="text-sm text-gray-600 mt-1">{activity.details}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleString()} • {activity.performed_by}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>No activity recorded yet.</p>
          <p className="text-sm">Contract changes and updates will appear here.</p>
        </div>
      )}

      {/* Meta Info */}
      <div className="border-t pt-4 mt-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span>{' '}
            <span className="font-medium">{new Date(contract.created_at).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Last Updated:</span>{' '}
            <span className="font-medium">{new Date(contract.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Accounting Tab
function AccountingTab({
  contract,
  ledgerView,
  onActivate,
  onGeneratePayables,
  onPostPayable,
  onPayPayable,
  actionLoading,
}: {
  contract: Contract
  ledgerView: LedgerView | null
  onActivate: () => void
  onGeneratePayables: () => void
  onPostPayable: (id: string) => void
  onPayPayable: (id: string) => void
  actionLoading: string | null
}) {
  const isActivated = !!ledgerView?.mapping

  if (!isActivated) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Accounting Not Activated</h3>
        <p className="text-gray-500 mb-4">
          Activate accounting to track expenses, generate payables, and create journal entries.
        </p>
        <button
          onClick={onActivate}
          disabled={actionLoading === 'activate'}
          className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50"
        >
          {actionLoading === 'activate' ? 'Activating...' : 'Activate Accounting'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Accounting Status */}
      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
        <div>
          <p className="font-medium text-green-800">Accounting Activated</p>
          <p className="text-sm text-green-600">
            Activated on {new Date(ledgerView.mapping!.activated_at).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={onGeneratePayables}
          disabled={actionLoading === 'generate'}
          className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition disabled:opacity-50"
        >
          {actionLoading === 'generate' ? 'Generating...' : 'Generate Payables'}
        </button>
      </div>

      {/* Scheduled Payables */}
      {ledgerView.payables && ledgerView.payables.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Scheduled Payables</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3">Due Date</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-center py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledgerView.payables.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{new Date(p.due_date).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-right font-medium">₹{p.amount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          p.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : p.status === 'POSTED'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {p.status === 'SCHEDULED' && (
                        <button
                          onClick={() => onPostPayable(p.id)}
                          disabled={actionLoading === `post-${p.id}`}
                          className="text-sm text-violet-600 hover:underline disabled:opacity-50"
                        >
                          {actionLoading === `post-${p.id}` ? 'Posting...' : 'Post'}
                        </button>
                      )}
                      {p.status === 'POSTED' && (
                        <button
                          onClick={() => onPayPayable(p.id)}
                          disabled={actionLoading === `pay-${p.id}`}
                          className="text-sm text-green-600 hover:underline disabled:opacity-50"
                        >
                          {actionLoading === `pay-${p.id}` ? 'Recording...' : 'Record Payment'}
                        </button>
                      )}
                      {p.status === 'PAID' && <span className="text-xs text-gray-500">Completed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Journal Entries */}
      {ledgerView.journals && ledgerView.journals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Journal Entries</h3>
          <div className="space-y-3">
            {ledgerView.journals.map((je) => (
              <div key={je.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50">
                  <div>
                    <p className="font-medium">{je.description}</p>
                    <p className="text-xs text-gray-500">{new Date(je.entry_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      Dr: ₹{je.total_debit.toLocaleString()} | Cr: ₹{je.total_credit.toLocaleString()}
                    </p>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t">
                      <th className="text-left py-2 px-3">Ledger</th>
                      <th className="text-right py-2 px-3">Debit</th>
                      <th className="text-right py-2 px-3">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {je.lines.map((line, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 px-3">{line.ledger_name}</td>
                        <td className="py-2 px-3 text-right">{line.debit > 0 ? `₹${line.debit.toLocaleString()}` : ''}</td>
                        <td className="py-2 px-3 text-right">{line.credit > 0 ? `₹${line.credit.toLocaleString()}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Info Card Component
function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium mt-1">{value}</p>
    </div>
  )
}
