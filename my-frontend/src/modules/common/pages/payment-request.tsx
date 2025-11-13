'use client';

import React, { useState } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import { 
  DollarSign, 
  Upload, 
  Calendar, 
  User, 
  Building2, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Plus,
  Trash2,
  Paperclip,
  X
} from 'lucide-react';

interface PaymentRequest {
  id: string;
  requestDate: string;
  // optional legacy single-amount fields (kept for compatibility)
  amount: number;
  currency: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  beneficiary: string;
  accountNumber: string;
  bankName: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
  attachments: File[];
  // optional client fields used by the form
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  invoiceNumber?: string;
}

interface CategoryItem {
  id: string;
  serial: number;
  category: string;
  amount: number;
  note: string;
  attachments: File[];
}

/**
 * Common Module - Payment Request Page
 * Accessible to ALL authenticated users regardless of role
 */
export default function PaymentRequestPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<Partial<PaymentRequest>>({
    // top-level amount/category kept but not used; per-category rows below
    amount: 0,
    currency: 'USD',
    category: 'general',
    priority: 'medium',
    description: '',
    beneficiary: '',
    accountNumber: '',
    bankName: '',
    // additional fields per current UI
    clientName: '' as any,
    clientEmail: '' as any,
    clientPhone: '' as any,
    invoiceNumber: '' as any,
    attachments: [],
  });

  // Dynamic payment items by category
  const [items, setItems] = useState<CategoryItem[]>([
    { id: 'item-1', serial: 1, category: 'general', amount: 0, note: '', attachments: [] }
  ]);

  // GST handling
  const [gstBill, setGstBill] = useState(false);
  const [gstRate, setGstRate] = useState<number | ''>('');
  const [showGstModal, setShowGstModal] = useState(false);

  // Mock payment history
  const [paymentHistory] = useState<PaymentRequest[]>([
    {
      id: 'PR-2024-001',
      requestDate: '2024-10-20',
      amount: 5000,
      currency: 'USD',
      category: 'Travel',
      priority: 'medium',
      description: 'Business travel expenses',
      beneficiary: 'John Doe',
      accountNumber: '****1234',
      bankName: 'Bank of America',
      status: 'approved',
      attachments: [],
    },
    {
      id: 'PR-2024-002',
      requestDate: '2024-10-18',
      amount: 12000,
      currency: 'USD',
      category: 'Vendor Payment',
      priority: 'high',
      description: 'Invoice payment for services',
      beneficiary: 'ABC Corp',
      accountNumber: '****5678',
      bankName: 'Chase Bank',
      status: 'paid',
      attachments: [],
    },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFormData(prev => ({ 
        ...prev, 
        attachments: [...(prev.attachments || []), ...filesArray]
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof CategoryItem, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as CategoryItem;
      return next;
    });
  };

  const handleItemFileUpload = (index: number, files: FileList | null) => {
    if (!files) return;
    const filesArray = Array.from(files);
    setItems(prev => {
      const next = [...prev];
      const existing = next[index]?.attachments || [];
      next[index] = { ...next[index], attachments: [...existing, ...filesArray] };
      return next;
    });
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: `item-${prev.length + 1}`,
        serial: prev.length + 1,
        category: 'general',
        amount: 0,
        note: '',
        attachments: [] }
    ]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index).map((it, i2) => ({ ...it, serial: i2 + 1 })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    console.log('Payment Request Submitted:', { formData, items, gstBill, gstRate, total });
    alert('Payment request submitted successfully!');
    // Reset form
    setFormData({
      amount: 0,
      currency: 'USD',
      category: 'general',
      priority: 'medium',
      description: '',
      beneficiary: '',
      accountNumber: '',
      bankName: '',
      clientName: '' as any,
      clientEmail: '' as any,
      clientPhone: '' as any,
      invoiceNumber: '' as any,
      attachments: [],
    });
    setItems([{ id: 'item-1', serial: 1, category: 'general', amount: 0, note: '', attachments: [] }]);
    setGstBill(false);
    setGstRate('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'paid': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'paid': return <DollarSign className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout title="Payment Request">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!user) {
    return (
      <SuperAdminLayout title="Payment Request">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to submit payment requests.
            </p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Payment Request
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Submit new payment requests and track existing ones
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'new'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              New Request
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Request History ({paymentHistory.length})
            </button>
          </div>
        </div>

        {/* New Request Form */}
        {activeTab === 'new' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Client Information - left aligned grid; description on the right of client email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Name *</label>
                  <input
                    type="text"
                    name="clientName"
                    value={(formData as any).clientName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter client name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Email *</label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={(formData as any).clientEmail || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="client@example.com"
                    required
                  />
                </div>

                {/* Description placed to the right of client email (row 2, col 2) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Phone</label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={(formData as any).clientPhone || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter payment request description"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={(formData as any).invoiceNumber || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="INV-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Category Items: left side category dropdown, right side amount + small note, per-row attachments */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Payment Items by Category</h3>
                  <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((it, index) => (
                    <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg">
                      <div className="md:col-span-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">S/N</label>
                        <input disabled value={it.serial} className="w-full px-2 py-2 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-center" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Category</label>
                        <select
                          value={it.category}
                          onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        >
                          <option value="general">General</option>
                          <option value="travel">Travel</option>
                          <option value="vendor">Vendor Payment</option>
                          <option value="salary">Salary</option>
                          <option value="utilities">Utilities</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            value={it.amount}
                            onChange={(e) => handleItemChange(index, 'amount', Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Small Note</label>
                        <input
                          type="text"
                          value={it.note}
                          onChange={(e) => handleItemChange(index, 'note', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                          placeholder="Optional note"
                        />
                      </div>
                      <div className="md:col-span-10">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Attachments</label>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Paperclip className="w-4 h-4" /> Upload
                            <input type="file" className="hidden" onChange={(e) => handleItemFileUpload(index, e.target.files)} multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                          </label>
                          {it.attachments?.length ? (
                            <span className="text-xs text-gray-600 dark:text-gray-400">{it.attachments.length} file(s) attached</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="md:col-span-2 flex items-end">
                        <button type="button" onClick={() => removeItem(index)} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30">
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST Bill checkbox and modal */}
              <div className="flex items-center gap-2">
                <input
                  id="gstBill"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={gstBill}
                  onChange={(e) => { setGstBill(e.target.checked); if (e.target.checked) setShowGstModal(true); }}
                />
                <label htmlFor="gstBill" className="text-sm text-gray-700 dark:text-gray-300">GST Bill</label>
              </div>

              {showGstModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowGstModal(false)} />
                  <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">GST Details</h4>
                      <button type="button" onClick={() => setShowGstModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GST Rate (%)</label>
                    <input
                      type="number"
                      value={gstRate as any}
                      onChange={(e) => setGstRate(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter GST rate, e.g., 18"
                    />
                    <div className="mt-4 flex justify-end gap-2">
                      <button type="button" onClick={() => setShowGstModal(false)} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600">Close</button>
                      <button type="button" onClick={() => setShowGstModal(false)} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white">Save</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Beneficiary Information */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Beneficiary Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Beneficiary Name *
                    </label>
                    <input
                      type="text"
                      name="beneficiary"
                      value={formData.beneficiary}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter beneficiary name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter account number"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter bank name"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* File Attachments */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Supporting Documents
                </h3>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-12 h-12 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      PDF, DOC, DOCX, JPG, PNG (max 10MB)
                    </span>
                  </label>
                  {formData.attachments && formData.attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded p-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                attachments: prev.attachments?.filter((_, i) => i !== index)
                              }));
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 md:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                           font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Request
                </button>
                <button
                  type="button"
                  className="flex-1 md:flex-none px-6 py-2 border border-gray-300 dark:border-gray-600 
                           hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 
                           rounded-lg font-medium transition-colors"
                >
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Request History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {paymentHistory.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Payment Requests Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You haven't submitted any payment requests yet.
                </p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Create New Request
                </button>
              </div>
            ) : (
              paymentHistory.map((request) => (
                <div
                  key={request.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {request.id}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                        <span className={`text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {request.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {request.requestDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {request.beneficiary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {request.bankName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {request.currency} {request.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {request.category}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                      View Details
                    </button>
                    {request.status === 'draft' && (
                      <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
  </div>
    </SuperAdminLayout>
  );
}
