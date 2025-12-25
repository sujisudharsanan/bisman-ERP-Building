'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import api from '@/lib/api';

// Types
interface BankTemplate {
  id: string;
  bank_name: string;
  bank_code: string | null;
  file_type: 'csv' | 'excel';
  delimiter: string;
  has_header: boolean;
  header_row: number;
  data_start_row: number;
  column_mappings: ColumnMappings;
  date_format: string;
  amount_format: string | null;
  utr_extraction_regex: string | null;
  credit_indicator: CreditIndicator | null;
  skip_patterns: string[];
  is_active: boolean;
  created_at: string;
}

interface ColumnMappings {
  date?: number;
  value_date?: number;
  description?: number;
  narration?: number;
  reference?: number;
  utr?: number;
  cheque?: number;
  amount?: number;
  credit?: number;
  debit?: number;
  balance?: number;
}

interface CreditIndicator {
  column: number;
  value: string;
}

// Default template for new templates
const defaultTemplate: Partial<BankTemplate> = {
  bank_name: '',
  bank_code: null,
  file_type: 'csv',
  delimiter: ',',
  has_header: true,
  header_row: 1,
  data_start_row: 2,
  column_mappings: {
    date: 0,
    description: 1,
    amount: 2,
  },
  date_format: 'DD-MM-YYYY',
  amount_format: null,
  utr_extraction_regex: null,
  credit_indicator: null,
  skip_patterns: [],
  is_active: true,
};

export default function BankTemplatesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [templates, setTemplates] = useState<BankTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<BankTemplate> | null>(null);
  const [saving, setSaving] = useState(false);

  // Role-based access
  const isAdmin = user?.role === 'ADMIN';

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reconciliation/templates', {
        params: { includeInactive: isAdmin },
      });

      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchTemplates();
    }
  }, [authLoading, isAuthenticated, fetchTemplates]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/reconciliation');
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Open create modal
  const handleCreate = () => {
    setEditingTemplate({ ...defaultTemplate });
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (template: BankTemplate) => {
    setEditingTemplate({ ...template });
    setShowModal(true);
  };

  // Save template
  const handleSave = async () => {
    if (!editingTemplate?.bank_name) {
      setError('Bank name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingTemplate.id) {
        // Update existing
        await api.put(`/api/reconciliation/templates/${editingTemplate.id}`, editingTemplate);
        setSuccess('Template updated successfully');
      } else {
        // Create new
        await api.post('/api/reconciliation/templates', editingTemplate);
        setSuccess('Template created successfully');
      }

      setShowModal(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Delete/deactivate template
  const handleDelete = async (templateId: string) => {
    if (!confirm('Deactivate this template? It will no longer be available for new uploads.')) {
      return;
    }

    try {
      await api.delete(`/api/reconciliation/templates/${templateId}`);
      setSuccess('Template deactivated');
      fetchTemplates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
    }
  };

  // Update column mapping
  const updateMapping = (field: string, value: string) => {
    if (!editingTemplate) return;
    
    const mappings = { ...editingTemplate.column_mappings };
    if (value === '' || value === '-1') {
      delete mappings[field as keyof ColumnMappings];
    } else {
      mappings[field as keyof ColumnMappings] = parseInt(value);
    }
    
    setEditingTemplate({
      ...editingTemplate,
      column_mappings: mappings,
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/reconciliation')}
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bank Templates</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Configure parsing templates for different bank statement formats
                </p>
              </div>
            </div>
            
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Template
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="mt-1 text-xs text-red-500 underline">Dismiss</button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-700">{success}</p>
            <button onClick={() => setSuccess(null)} className="mt-1 text-xs text-green-500 underline">Dismiss</button>
          </div>
        )}

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a bank template.</p>
            <div className="mt-6">
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`bg-white rounded-lg shadow overflow-hidden ${!template.is_active ? 'opacity-60' : ''}`}
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{template.bank_name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.file_type === 'csv' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {template.file_type.toUpperCase()}
                    </span>
                  </div>
                  
                  {template.bank_code && (
                    <p className="mt-1 text-sm text-gray-500">Code: {template.bank_code}</p>
                  )}

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Date Format:</span>
                      <span className="font-mono">{template.date_format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Start Row:</span>
                      <span>{template.data_start_row}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Columns Mapped:</span>
                      <span>{Object.keys(template.column_mappings || {}).length}</span>
                    </div>
                    {template.utr_extraction_regex && (
                      <div className="flex justify-between">
                        <span>UTR Regex:</span>
                        <span className="text-green-600">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-gray-400">
                    Created: {format(new Date(template.created_at), 'dd MMM yyyy')}
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50 flex justify-between">
                  <button
                    onClick={() => handleEdit(template)}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  {template.is_active && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-sm text-red-600 hover:text-red-900"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {showModal && editingTemplate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTemplate.id ? 'Edit Template' : 'Create Template'}
              </h3>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.bank_name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, bank_name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., HDFC Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Code</label>
                  <input
                    type="text"
                    value={editingTemplate.bank_code || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, bank_code: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., HDFC"
                  />
                </div>
              </div>

              {/* File Settings */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">File Type</label>
                  <select
                    value={editingTemplate.file_type}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, file_type: e.target.value as 'csv' | 'excel' })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delimiter</label>
                  <input
                    type="text"
                    value={editingTemplate.delimiter || ','}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, delimiter: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder=","
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Header Row</label>
                  <input
                    type="number"
                    min="1"
                    value={editingTemplate.header_row || 1}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, header_row: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Start Row</label>
                  <input
                    type="number"
                    min="1"
                    value={editingTemplate.data_start_row || 2}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, data_start_row: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Date/Amount Format */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date Format</label>
                  <select
                    value={editingTemplate.date_format || 'DD-MM-YYYY'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, date_format: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g., 15-Jan-2024)</option>
                    <option value="DD MMM YYYY">DD MMM YYYY (e.g., 15 Jan 2024)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount Format</label>
                  <select
                    value={editingTemplate.amount_format || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, amount_format: e.target.value || null })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Standard (1,234.56)</option>
                    <option value="indian">Indian (1,23,456.78)</option>
                    <option value="european">European (1.234,56)</option>
                  </select>
                </div>
              </div>

              {/* Column Mappings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Column Mappings (0-based index)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Specify which column index contains each field. Leave blank for fields not in the statement.
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'date', label: 'Date *' },
                    { key: 'value_date', label: 'Value Date' },
                    { key: 'description', label: 'Description' },
                    { key: 'narration', label: 'Narration' },
                    { key: 'reference', label: 'Reference' },
                    { key: 'utr', label: 'UTR' },
                    { key: 'cheque', label: 'Cheque No' },
                    { key: 'amount', label: 'Amount *' },
                    { key: 'credit', label: 'Credit' },
                    { key: 'debit', label: 'Debit' },
                    { key: 'balance', label: 'Balance' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-600">{label}</label>
                      <input
                        type="number"
                        min="-1"
                        value={editingTemplate.column_mappings?.[key as keyof ColumnMappings] ?? ''}
                        onChange={(e) => updateMapping(key, e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="-"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* UTR Extraction Regex */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  UTR Extraction Regex (Optional)
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Regular expression to extract UTR from description. Use capture group for UTR value.
                </p>
                <input
                  type="text"
                  value={editingTemplate.utr_extraction_regex || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, utr_extraction_regex: e.target.value || null })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                  placeholder="e.g., UTR[:\s]*([A-Z0-9]+)"
                />
              </div>

              {/* Skip Patterns */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skip Patterns (Optional)
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated regex patterns for rows to skip (e.g., headers, totals)
                </p>
                <input
                  type="text"
                  value={(editingTemplate.skip_patterns || []).join(', ')}
                  onChange={(e) => setEditingTemplate({ 
                    ...editingTemplate, 
                    skip_patterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., ^Total, Opening Balance"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTemplate(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingTemplate.bank_name}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingTemplate.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
