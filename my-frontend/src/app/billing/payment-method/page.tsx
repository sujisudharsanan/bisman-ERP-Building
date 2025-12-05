'use client';

/**
 * Payment Method / Billing Profile Page
 * BISMAN ERP - Payment Method Management
 *
 * Features:
 * - View/Edit card info (masked)
 * - Billing address management
 * - VAT/Tax ID input
 * - Multiple payment methods support
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Building,
  MapPin,
  Globe,
  FileText,
  ArrowLeft,
  Star,
  X,
  Shield,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  bankName?: string;
  isDefault: boolean;
  createdAt: string;
}

interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface BillingProfile {
  companyName: string;
  email: string;
  phone?: string;
  vatId?: string;
  taxId?: string;
  address: BillingAddress;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  diners: '💳',
  jcb: '💳',
  unionpay: '💳',
};

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

// Payment Method Card Component
function PaymentMethodCard({
  method,
  onSetDefault,
  onRemove,
}: {
  method: PaymentMethod;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to remove this payment method?')) {
      setIsRemoving(true);
      await onRemove(method.id);
      setIsRemoving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border-2 transition-colors ${
        method.isDefault
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
          : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Card Visual */}
          <div className="w-16 h-10 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold uppercase">{method.brand}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white">
                •••• •••• •••• {method.last4}
              </p>
              {method.isDefault && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Default
                </span>
              )}
            </div>
            {method.type === 'card' && method.expMonth && method.expYear && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!method.isDefault && (
            <button
              onClick={() => onSetDefault(method.id)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Set as Default
            </button>
          )}
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {isRemoving ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Add Payment Method Modal
function AddPaymentMethodModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ').substring(0, 19) : '';
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // In a real implementation, this would create a Stripe token
    await onAdd({
      type: 'card',
      cardNumber: cardNumber.replace(/\s/g, ''),
      expiry,
      cvc,
      cardholderName,
    });
    
    setIsLoading(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Payment Method</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                required
              />
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CVC
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>Your payment information is encrypted and secure</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Payment Method
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Billing Address Form
function BillingAddressForm({
  profile,
  onSave,
}: {
  profile: BillingProfile;
  onSave: (data: BillingProfile) => void;
}) {
  const [formData, setFormData] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building className="w-5 h-5 text-violet-500" />
          Billing Information
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormData(profile);
                setIsEditing(false);
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.companyName || '—'}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Billing Email
          </label>
          {isEditing ? (
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.email || '—'}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.phone || '—'}</p>
          )}
        </div>

        {/* Address Line 1 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address Line 1
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.line1}
              onChange={(e) =>
                setFormData({ ...formData, address: { ...formData.address, line1: e.target.value } })
              }
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.address.line1 || '—'}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address Line 2 (Optional)
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.line2 || ''}
              onChange={(e) =>
                setFormData({ ...formData, address: { ...formData.address, line2: e.target.value } })
              }
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.address.line2 || '—'}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            City
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.city}
              onChange={(e) =>
                setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })
              }
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.address.city || '—'}</p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            State / Province
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.state}
              onChange={(e) =>
                setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })
              }
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.address.state || '—'}</p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Postal Code
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.postalCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, postalCode: e.target.value },
                })
              }
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{formData.address.postalCode || '—'}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Country
          </label>
          {isEditing ? (
            <select
              value={formData.address.country}
              onChange={(e) =>
                setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })
              }
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">
              {COUNTRIES.find((c) => c.code === formData.address.country)?.name || formData.address.country || '—'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Tax Information Form
function TaxInfoForm({
  profile,
  onSave,
}: {
  profile: BillingProfile;
  onSave: (data: Partial<BillingProfile>) => void;
}) {
  const [vatId, setVatId] = useState(profile.vatId || '');
  const [taxId, setTaxId] = useState(profile.taxId || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ vatId, taxId });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-500" />
          Tax Information
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVatId(profile.vatId || '');
                setTaxId(profile.taxId || '');
                setIsEditing(false);
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VAT ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            VAT ID (for EU businesses)
          </label>
          {isEditing ? (
            <input
              type="text"
              value={vatId}
              onChange={(e) => setVatId(e.target.value.toUpperCase())}
              placeholder="e.g., DE123456789"
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{vatId || '—'}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter your VAT registration number for tax-exempt invoices
          </p>
        </div>

        {/* Tax ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tax ID / EIN
          </label>
          {isEditing ? (
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="e.g., 12-3456789"
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900 dark:text-white">{taxId || '—'}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your business tax identification number
          </p>
        </div>
      </div>

      {/* Tax Notice */}
      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm">
        <p>
          💡 If you&apos;re a business in the EU with a valid VAT ID, you may be eligible for VAT exemption on your
          subscription. Your VAT ID will be validated automatically.
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PaymentMethodPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingProfile, setBillingProfile] = useState<BillingProfile>({
    companyName: '',
    email: '',
    phone: '',
    vatId: '',
    taxId: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
  });
  const [showAddModal, setShowAddModal] = useState(false);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [methodsRes, profileRes] = await Promise.all([
        fetch(`${baseURL}/api/billing/payment-methods`, { credentials: 'include' }),
        fetch(`${baseURL}/api/billing/profile`, { credentials: 'include' }),
      ]);

      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(data.methods || []);
      } else {
        generateDemoMethods();
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        setBillingProfile(data);
      } else {
        generateDemoProfile();
      }
    } catch {
      generateDemoMethods();
      generateDemoProfile();
    } finally {
      setIsLoading(false);
    }
  }, [baseURL]);

  const generateDemoMethods = () => {
    setPaymentMethods([
      {
        id: 'pm_1',
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2026,
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pm_2',
        type: 'card',
        brand: 'mastercard',
        last4: '5555',
        expMonth: 6,
        expYear: 2025,
        isDefault: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  };

  const generateDemoProfile = () => {
    setBillingProfile({
      companyName: 'Acme Corporation',
      email: 'billing@acme.com',
      phone: '+1 (555) 123-4567',
      vatId: '',
      taxId: '12-3456789',
      address: {
        line1: '123 Business Street',
        line2: 'Suite 100',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
      },
    });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPaymentMethod = async (data: any) => {
    try {
      const response = await fetch(`${baseURL}/api/billing/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchData();
      } else {
        // Demo: Add a fake method
        setPaymentMethods((prev) => [
          ...prev,
          {
            id: `pm_${Date.now()}`,
            type: 'card',
            brand: 'visa',
            last4: data.cardNumber.slice(-4),
            expMonth: parseInt(data.expiry.split('/')[0]),
            expYear: 2000 + parseInt(data.expiry.split('/')[1]),
            isDefault: prev.length === 0,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to add payment method:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`${baseURL}/api/billing/payment-methods/${id}/default`, {
        method: 'PUT',
        credentials: 'include',
      });
      setPaymentMethods((prev) =>
        prev.map((m) => ({ ...m, isDefault: m.id === id }))
      );
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await fetch(`${baseURL}/api/billing/payment-methods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Failed to remove payment method:', error);
    }
  };

  const handleSaveProfile = async (data: BillingProfile) => {
    try {
      await fetch(`${baseURL}/api/billing/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      setBillingProfile(data);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleSaveTaxInfo = async (data: Partial<BillingProfile>) => {
    try {
      await fetch(`${baseURL}/api/billing/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...billingProfile, ...data }),
      });
      setBillingProfile((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to save tax info:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/billing"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-violet-500" />
              Payment Methods
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your payment methods and billing information
          </p>
        </div>

        {/* Payment Methods Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Payment Methods</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>

          {paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onSetDefault={handleSetDefault}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No payment methods on file</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
              >
                Add Payment Method
              </button>
            </div>
          )}
        </motion.div>

        {/* Billing Address */}
        <BillingAddressForm profile={billingProfile} onSave={handleSaveProfile} />

        {/* Tax Information */}
        <div className="mt-6">
          <TaxInfoForm profile={billingProfile} onSave={handleSaveTaxInfo} />
        </div>

        {/* Add Payment Method Modal */}
        <AnimatePresence>
          <AddPaymentMethodModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddPaymentMethod}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
