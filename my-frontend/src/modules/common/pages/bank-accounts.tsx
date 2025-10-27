'use client';

import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '../../../common/layouts/superadmin-layout';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Star,
  Shield,
  AlertCircle,
  CreditCard,
  Upload,
  FileText,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  Info,
} from 'lucide-react';

// Types
interface BankAccount {
  id: string;
  user_id: string;
  account_holder_name: string;
  account_number: string;
  account_type: 'savings' | 'current' | 'salary' | 'business';
  bank_name: string;
  branch_name?: string;
  ifsc_code?: string;
  swift_code?: string;
  iban?: string;
  routing_number?: string;
  sort_code?: string;
  bsb_number?: string;
  branch_address?: string;
  currency: string;
  is_primary: boolean;
  is_verified: boolean;
  is_active: boolean;
  status: 'active' | 'inactive' | 'closed';
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  documents: Array<{ file_key: string; type: string; uploaded_at: string }>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface BankAccountFormData {
  account_holder_name: string;
  account_number: string;
  account_type: 'savings' | 'current' | 'salary' | 'business';
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  swift_code: string;
  iban: string;
  routing_number: string;
  sort_code: string;
  bsb_number: string;
  branch_address: string;
  currency: string;
  notes: string;
  is_primary: boolean;
}

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account', icon: '💰' },
  { value: 'current', label: 'Current Account', icon: '💼' },
  { value: 'salary', label: 'Salary Account', icon: '💵' },
  { value: 'business', label: 'Business Account', icon: '🏢' },
];

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

export default function BankAccountsPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showAccountNumbers, setShowAccountNumbers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  
  const [formData, setFormData] = useState<BankAccountFormData>({
    account_holder_name: '',
    account_number: '',
    account_type: 'savings',
    bank_name: '',
    branch_name: '',
    ifsc_code: '',
    swift_code: '',
    iban: '',
    routing_number: '',
    sort_code: '',
    bsb_number: '',
    branch_address: '',
    currency: 'USD',
    notes: '',
    is_primary: false,
  });

  useEffect(() => {
    if (user) {
      fetchBankAccounts();
    }
  }, [user]);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/bank-accounts');
      // const data = await response.json();
      // setAccounts(data);
      
      // Mock data for testing
      const mockAccounts: BankAccount[] = [
        {
          id: '1',
          user_id: String(user?.id || ''),
          account_holder_name: user?.name || user?.username || '',
          account_number: '1234567890',
          account_type: 'salary',
          bank_name: 'State Bank of India',
          branch_name: 'Main Branch',
          ifsc_code: 'SBIN0001234',
          currency: 'INR',
          is_primary: true,
          is_verified: true,
          is_active: true,
          status: 'active',
          verified_at: '2024-01-15',
          documents: [],
          created_at: '2024-01-01',
          updated_at: '2024-01-15',
        },
        {
          id: '2',
          user_id: String(user?.id || ''),
          account_holder_name: user?.name || user?.username || '',
          account_number: '9876543210',
          account_type: 'savings',
          bank_name: 'HDFC Bank',
          branch_name: 'City Center',
          ifsc_code: 'HDFC0000123',
          currency: 'INR',
          is_primary: false,
          is_verified: false,
          is_active: true,
          status: 'active',
          documents: [],
          created_at: '2024-02-01',
          updated_at: '2024-02-01',
        },
      ];
      setAccounts(mockAccounts);
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = () => {
    setFormData({
      account_holder_name: user?.name || user?.username || '',
      account_number: '',
      account_type: 'savings',
      bank_name: '',
      branch_name: '',
      ifsc_code: '',
      swift_code: '',
      iban: '',
      routing_number: '',
      sort_code: '',
      bsb_number: '',
      branch_address: '',
      currency: 'USD',
      notes: '',
      is_primary: accounts.length === 0, // First account is primary by default
    });
    setShowAddModal(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setFormData({
      account_holder_name: account.account_holder_name,
      account_number: account.account_number,
      account_type: account.account_type,
      bank_name: account.bank_name,
      branch_name: account.branch_name || '',
      ifsc_code: account.ifsc_code || '',
      swift_code: account.swift_code || '',
      iban: account.iban || '',
      routing_number: account.routing_number || '',
      sort_code: account.sort_code || '',
      bsb_number: account.bsb_number || '',
      branch_address: account.branch_address || '',
      currency: account.currency,
      notes: account.notes || '',
      is_primary: account.is_primary,
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Replace with actual API call
      // if (showEditModal && selectedAccount) {
      //   await fetch(`/api/bank-accounts/${selectedAccount.id}`, {
      //     method: 'PUT',
      //     body: JSON.stringify(formData),
      //   });
      // } else {
      //   await fetch('/api/bank-accounts', {
      //     method: 'POST',
      //     body: JSON.stringify(formData),
      //   });
      // }
      
      console.log('Form submitted:', formData);
      setShowAddModal(false);
      setShowEditModal(false);
      fetchBankAccounts();
    } catch (error) {
      console.error('Failed to save bank account:', error);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/bank-accounts/${accountId}`, { method: 'DELETE' });
      console.log('Delete account:', accountId);
      fetchBankAccounts();
    } catch (error) {
      console.error('Failed to delete bank account:', error);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/bank-accounts/${accountId}/set-primary`, { method: 'POST' });
      console.log('Set primary account:', accountId);
      fetchBankAccounts();
    } catch (error) {
      console.error('Failed to set primary account:', error);
    }
  };

  const toggleShowAccountNumber = (accountId: string) => {
    setShowAccountNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  const getAccountTypeInfo = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[0];
  };

  const getStatusColor = (status: string, verified: boolean) => {
    if (!verified) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'closed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const filteredAccounts = accounts.filter(account => 
    activeTab === 'active' ? account.is_active : true
  );

  if (authLoading) {
    return (
      <SuperAdminLayout title="Bank Accounts">
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
      <SuperAdminLayout title="Bank Accounts">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to manage your bank accounts.
            </p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title="Bank Accounts"
      description="Manage your bank account information"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Bank Accounts
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your bank account details for salary and payments
                </p>
              </div>
            </div>
            <button
              onClick={handleAddAccount}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-medium mb-1">Bank Account Security</p>
              <p className="text-blue-700 dark:text-blue-300">
                Your bank account information is encrypted and secure. Only verified accounts can be used for salary payments. 
                Please ensure all information is accurate.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'active'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Active Accounts
            {activeTab === 'active' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'all'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            All Accounts
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>

        {/* Account List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Bank Accounts
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't added any bank accounts yet. Add your first account to receive payments.
            </p>
            <button
              onClick={handleAddAccount}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Bank Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => {
              const accountTypeInfo = getAccountTypeInfo(account.account_type);
              const isNumberVisible = showAccountNumbers.has(account.id);
              
              return (
                <div
                  key={account.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-2xl">{accountTypeInfo.icon}</div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {account.bank_name}
                            </h3>
                            {account.is_primary && (
                              <span className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded">
                                <Star className="w-3 h-3 fill-current" />
                                <span>Primary</span>
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(account.status, account.is_verified)}`}>
                              {account.is_verified ? (
                                <span className="flex items-center space-x-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending Verification</span>
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {accountTypeInfo.label}
                          </p>
                        </div>
                      </div>

                      {/* Account Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Account Holder
                          </label>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                            {account.account_holder_name}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Account Number
                          </label>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                              {isNumberVisible ? account.account_number : maskAccountNumber(account.account_number)}
                            </p>
                            <button
                              onClick={() => toggleShowAccountNumber(account.id)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              {isNumberVisible ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {account.branch_name && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Branch
                            </label>
                            <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                              {account.branch_name}
                            </p>
                          </div>
                        )}
                        {account.ifsc_code && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              IFSC Code
                            </label>
                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                              {account.ifsc_code}
                            </p>
                          </div>
                        )}
                        {account.swift_code && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              SWIFT Code
                            </label>
                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                              {account.swift_code}
                            </p>
                          </div>
                        )}
                        {account.iban && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              IBAN
                            </label>
                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                              {account.iban}
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Currency
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                            {account.currency}
                          </p>
                        </div>
                      </div>

                      {account.notes && (
                        <div className="mb-4">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Notes
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {account.notes}
                          </p>
                        </div>
                      )}

                      {/* Verification Info */}
                      {account.is_verified && account.verified_at && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Verified on {new Date(account.verified_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {!account.is_primary && account.is_verified && (
                        <button
                          onClick={() => handleSetPrimary(account.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title="Set as primary account"
                        >
                          <Star className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit account"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {showEditModal ? 'Edit Bank Account' : 'Add Bank Account'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Account Holder Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Name as per bank account"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Account Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter account number"
                    />
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Type *
                    </label>
                    <select
                      required
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    >
                      {ACCOUNT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bank Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., State Bank of India"
                    />
                  </div>

                  {/* Branch Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Branch name"
                    />
                  </div>
                </div>

                {/* Routing Codes */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Routing Codes (Provide at least one)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* IFSC Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        IFSC Code (India)
                      </label>
                      <input
                        type="text"
                        value={formData.ifsc_code}
                        onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="e.g., SBIN0001234"
                        maxLength={11}
                      />
                    </div>

                    {/* SWIFT Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SWIFT Code (International)
                      </label>
                      <input
                        type="text"
                        value={formData.swift_code}
                        onChange={(e) => setFormData({ ...formData, swift_code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="e.g., SBININBB123"
                        maxLength={11}
                      />
                    </div>

                    {/* IBAN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        IBAN (International)
                      </label>
                      <input
                        type="text"
                        value={formData.iban}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="e.g., GB29NWBK60161331926819"
                        maxLength={34}
                      />
                    </div>

                    {/* Routing Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Routing Number (US)
                      </label>
                      <input
                        type="text"
                        value={formData.routing_number}
                        onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="9-digit routing number"
                        maxLength={9}
                      />
                    </div>

                    {/* Sort Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sort Code (UK)
                      </label>
                      <input
                        type="text"
                        value={formData.sort_code}
                        onChange={(e) => setFormData({ ...formData, sort_code: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="e.g., 12-34-56"
                        maxLength={8}
                      />
                    </div>

                    {/* BSB Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        BSB Number (Australia)
                      </label>
                      <input
                        type="text"
                        value={formData.bsb_number}
                        onChange={(e) => setFormData({ ...formData, bsb_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="6-digit BSB"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Currency *
                    </label>
                    <select
                      required
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    >
                      {CURRENCIES.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Account */}
                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={formData.is_primary}
                      onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_primary" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Set as primary account for salary
                    </label>
                  </div>
                </div>

                {/* Branch Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Branch Address
                  </label>
                  <textarea
                    value={formData.branch_address}
                    onChange={(e) => setFormData({ ...formData, branch_address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Full branch address"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Any additional notes about this account..."
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>{showEditModal ? 'Update Account' : 'Add Account'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
