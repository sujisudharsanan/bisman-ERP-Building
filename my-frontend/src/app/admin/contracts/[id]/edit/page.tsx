'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Types
type ContractType = 'RENT' | 'VEHICLE' | 'VENDOR' | 'CUSTOM'
type PaymentCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED'

interface ContractFormData {
  contract_number: string
  contract_type: ContractType
  party_name: string
  party_contact: string
  party_address: string
  start_date: string
  end_date: string
  auto_renew: boolean
  renewal_notice_days: number
  monthly_value: number
  advance_amount: number
  security_deposit: number
  escalation_percent: number
  payment_day: number
  payment_cycle: PaymentCycle
  status: ContractStatus
  terms: string
  custom_fields: Record<string, any>
}

// Dynamic fields configuration by contract type
const CONTRACT_TYPE_FIELDS: Record<ContractType, { key: string; label: string; type: string; required?: boolean }[]> = {
  RENT: [
    { key: 'property_address', label: 'Property Address', type: 'textarea', required: true },
    { key: 'property_type', label: 'Property Type', type: 'select' },
    { key: 'carpet_area_sqft', label: 'Carpet Area (sq.ft)', type: 'number' },
    { key: 'maintenance_included', label: 'Maintenance Included', type: 'checkbox' },
    { key: 'electricity_included', label: 'Electricity Included', type: 'checkbox' },
    { key: 'lock_in_period_months', label: 'Lock-in Period (months)', type: 'number' },
    { key: 'notice_period_days', label: 'Notice Period (days)', type: 'number' },
  ],
  VEHICLE: [
    { key: 'vehicle_number', label: 'Vehicle Number', type: 'text', required: true },
    { key: 'vehicle_type', label: 'Vehicle Type', type: 'select' },
    { key: 'make_model', label: 'Make & Model', type: 'text' },
    { key: 'driver_included', label: 'Driver Included', type: 'checkbox' },
    { key: 'fuel_included', label: 'Fuel Included', type: 'checkbox' },
    { key: 'km_limit_per_month', label: 'KM Limit/Month', type: 'number' },
    { key: 'extra_km_rate', label: 'Extra KM Rate (₹)', type: 'number' },
  ],
  VENDOR: [
    { key: 'vendor_gstin', label: 'Vendor GSTIN', type: 'text' },
    { key: 'vendor_pan', label: 'Vendor PAN', type: 'text' },
    { key: 'service_type', label: 'Service Type', type: 'text', required: true },
    { key: 'sla_terms', label: 'SLA Terms', type: 'textarea' },
    { key: 'penalty_clause', label: 'Penalty Clause', type: 'textarea' },
    { key: 'payment_terms_days', label: 'Payment Terms (days)', type: 'number' },
  ],
  CUSTOM: [],
}

const SELECT_OPTIONS: Record<string, string[]> = {
  property_type: ['Office', 'Warehouse', 'Retail', 'Industrial', 'Residential', 'Land'],
  vehicle_type: ['Car', 'SUV', 'Van', 'Truck', 'Bus', 'Two-wheeler'],
}

export default function EditContractPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ContractFormData>({
    contract_number: '',
    contract_type: 'RENT',
    party_name: '',
    party_contact: '',
    party_address: '',
    start_date: '',
    end_date: '',
    auto_renew: false,
    renewal_notice_days: 30,
    monthly_value: 0,
    advance_amount: 0,
    security_deposit: 0,
    escalation_percent: 0,
    payment_day: 1,
    payment_cycle: 'MONTHLY',
    status: 'DRAFT',
    terms: '',
    custom_fields: {},
  })

  // Fetch existing contract
  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/contracts/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch contract')
      const json = await res.json()
      const c = json.data || json

      setFormData({
        contract_number: c.contract_number || '',
        contract_type: c.contract_type || 'RENT',
        party_name: c.party_name || '',
        party_contact: c.party_contact || '',
        party_address: c.party_address || '',
        start_date: c.start_date ? c.start_date.split('T')[0] : '',
        end_date: c.end_date ? c.end_date.split('T')[0] : '',
        auto_renew: c.auto_renew || false,
        renewal_notice_days: c.renewal_notice_days || 30,
        monthly_value: c.monthly_value || 0,
        advance_amount: c.advance_amount || 0,
        security_deposit: c.security_deposit || 0,
        escalation_percent: c.escalation_percent || 0,
        payment_day: c.payment_day || 1,
        payment_cycle: c.payment_cycle || 'MONTHLY',
        status: c.status || 'DRAFT',
        terms: c.terms || '',
        custom_fields: c.custom_fields || {},
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchContract()
  }, [id, fetchContract])

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (name.startsWith('custom_')) {
      const key = name.replace('custom_', '')
      setFormData((prev) => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [key]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
      }))
    }
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        ...formData,
        monthly_value: Number(formData.monthly_value),
        advance_amount: Number(formData.advance_amount),
        security_deposit: Number(formData.security_deposit),
        escalation_percent: Number(formData.escalation_percent),
        payment_day: Number(formData.payment_day),
        renewal_notice_days: Number(formData.renewal_notice_days),
      }

      const res = await fetch(`${API_BASE}/api/admin/contracts/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.message || 'Failed to update contract')
      }

      router.push(`/admin/contracts/${id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Get dynamic fields for current contract type
  const dynamicFields = CONTRACT_TYPE_FIELDS[formData.contract_type] || []

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Contract</h1>
          <p className="text-sm text-gray-500">{formData.contract_number || `Contract #${id.slice(0, 8)}`}</p>
        </div>
        <Link href={`/admin/contracts/${id}`} className="text-violet-600 hover:underline">
          ← Back to Details
        </Link>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number</label>
              <input
                type="text"
                name="contract_number"
                value={formData.contract_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="AUTO-GENERATED"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type *</label>
              <select
                name="contract_type"
                value={formData.contract_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                required
              >
                <option value="RENT">Rent Agreement</option>
                <option value="VEHICLE">Vehicle Lease</option>
                <option value="VENDOR">Vendor Contract</option>
                <option value="CUSTOM">Custom Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Name *</label>
              <input
                type="text"
                name="party_name"
                value={formData.party_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input
                type="text"
                name="party_contact"
                value={formData.party_contact}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                name="party_address"
                value={formData.party_address}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RENEWED">Renewed</option>
              </select>
            </div>
          </div>
        </section>

        {/* Dates Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Contract Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="auto_renew"
                checked={formData.auto_renew}
                onChange={handleChange}
                className="h-4 w-4 text-violet-600 rounded focus:ring-violet-500"
              />
              <label className="ml-2 text-sm text-gray-700">Auto Renew</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Notice (days)</label>
              <input
                type="number"
                name="renewal_notice_days"
                value={formData.renewal_notice_days}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
        </section>

        {/* Financials Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Financial Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Value (₹) *</label>
              <input
                type="number"
                name="monthly_value"
                value={formData.monthly_value}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount (₹)</label>
              <input
                type="number"
                name="advance_amount"
                value={formData.advance_amount}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                name="security_deposit"
                value={formData.security_deposit}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escalation %</label>
              <input
                type="number"
                name="escalation_percent"
                value={formData.escalation_percent}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Day</label>
              <input
                type="number"
                name="payment_day"
                value={formData.payment_day}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                min="1"
                max="31"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Cycle</label>
              <select
                name="payment_cycle"
                value={formData.payment_cycle}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>
        </section>

        {/* Dynamic Fields Section */}
        {dynamicFields.length > 0 && (
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">{formData.contract_type} Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dynamicFields.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      name={`custom_${field.key}`}
                      value={formData.custom_fields[field.key] || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      required={field.required}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      name={`custom_${field.key}`}
                      value={formData.custom_fields[field.key] || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {(SELECT_OPTIONS[field.key] || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        name={`custom_${field.key}`}
                        checked={!!formData.custom_fields[field.key]}
                        onChange={handleChange}
                        className="h-4 w-4 text-violet-600 rounded focus:ring-violet-500"
                      />
                      <span className="ml-2 text-sm text-gray-500">Yes</span>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      name={`custom_${field.key}`}
                      value={formData.custom_fields[field.key] || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Terms Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Terms & Conditions</h2>
          <textarea
            name="terms"
            value={formData.terms}
            onChange={handleChange}
            rows={6}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
            placeholder="Enter contract terms and conditions..."
          />
        </section>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/admin/contracts/${id}`}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
