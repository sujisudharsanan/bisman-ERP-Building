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
  Send
} from 'lucide-react';

interface PaymentRequest {
  id: string;
  requestDate: string;
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
}

/**
 * Common Module - Payment Request Page
 * Accessible to ALL authenticated users regardless of role
 */
export default function PaymentRequestPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<Partial<PaymentRequest>>({
    amount: 0,
    currency: 'USD',
    category: 'general',
    priority: 'medium',
    description: '',
    beneficiary: '',
    accountNumber: '',
    bankName: '',
    attachments: [],
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Payment Request Submitted:', formData);
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
      attachments: [],
    });
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
    <SuperAdminLayout
      title="Payment Request"
      description="Submit and track your payment requests"
    >
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
              {/* Amount and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              {/* Category and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide details about this payment request..."
                  required
                />
              </div>

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
