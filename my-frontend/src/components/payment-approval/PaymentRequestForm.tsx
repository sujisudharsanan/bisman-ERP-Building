/**
 * Payment Request Form Component
 * Allows users to create and edit payment requests with line items
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, Save, Send } from 'lucide-react';

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  discountRate: number;
  lineTotal: number;
  sortOrder: number;
}

interface PaymentRequestFormData {
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  description: string;
  notes?: string;
  dueDate?: string;
  invoiceNumber?: string;
  currency: string;
  lineItems: LineItem[];
  attachments?: Array<{ name: string; url: string }>;
}

interface PaymentRequestFormProps {
  initialData?: Partial<PaymentRequestFormData>;
  onSubmit: (data: PaymentRequestFormData, isDraft: boolean) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PaymentRequestForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: PaymentRequestFormProps) {
  const [formData, setFormData] = useState<PaymentRequestFormData>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    description: '',
    notes: '',
    dueDate: '',
    invoiceNumber: '',
    currency: 'INR',
    lineItems: [
      {
        description: '',
        quantity: 1,
        rate: 0,
        taxRate: 0,
        discountRate: 0,
        lineTotal: 0,
        sortOrder: 1,
      },
    ],
    attachments: [],
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
  });

  // Calculate line item total
  const calculateLineTotal = (item: Omit<LineItem, 'lineTotal'>) => {
    const subtotal = item.quantity * item.rate;
    const tax = (subtotal * item.taxRate) / 100;
    const discount = (subtotal * item.discountRate) / 100;
    return subtotal + tax - discount;
  };

  // Recalculate totals whenever line items change
  useEffect(() => {
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    formData.lineItems.forEach((item) => {
      const itemSubtotal = item.quantity * item.rate;
      subtotal += itemSubtotal;
      taxAmount += (itemSubtotal * item.taxRate) / 100;
      discountAmount += (itemSubtotal * item.discountRate) / 100;
    });

    const totalAmount = subtotal + taxAmount - discountAmount;

    setTotals({
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
    });
  }, [formData.lineItems]);

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...formData.lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    // Recalculate line total
    if (['quantity', 'rate', 'taxRate', 'discountRate'].includes(field)) {
      updatedItems[index].lineTotal = calculateLineTotal(updatedItems[index]);
    }

    setFormData({ ...formData, lineItems: updatedItems });
  };

  // Add line item
  const addLineItem = () => {
    const newItem: LineItem = {
      description: '',
      quantity: 1,
      rate: 0,
      taxRate: 0,
      discountRate: 0,
      lineTotal: 0,
      sortOrder: formData.lineItems.length + 1,
    };
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, newItem],
    });
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (formData.lineItems.length === 1) {
      alert('At least one line item is required');
      return;
    }
    const updatedItems = formData.lineItems.filter((_, i) => i !== index);
    // Update sort orders
    updatedItems.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });
    setFormData({ ...formData, lineItems: updatedItems });
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = 'Client email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Invalid email format';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.lineItems.length === 0) {
      newErrors.lineItems = 'At least one line item is required';
    }

    formData.lineItems.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`lineItem_${index}_description`] = 'Description is required';
      }
      if (item.quantity <= 0) {
        newErrors[`lineItem_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.rate < 0) {
        newErrors[`lineItem_${index}_rate`] = 'Rate cannot be negative';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft && !validate()) {
      return;
    }

    await onSubmit(formData, isDraft);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {initialData ? 'Edit Payment Request' : 'Create Payment Request'}
      </h2>

      {/* Client Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.clientName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter client name"
            />
            {errors.clientName && (
              <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.clientEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="client@example.com"
            />
            {errors.clientEmail && (
              <p className="text-red-500 text-xs mt-1">{errors.clientEmail}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Phone
            </label>
            <input
              type="tel"
              value={formData.clientPhone}
              onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="INV-2024-001"
            />
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Enter payment request description"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Additional notes or instructions"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Line Items</h3>
          <button
            onClick={addLineItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        {errors.lineItems && (
          <p className="text-red-500 text-sm mb-2">{errors.lineItems}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
                  Description
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-24">
                  Qty
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-32">
                  Rate
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-24">
                  Tax %
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-24">
                  Disc %
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium w-32">
                  Total
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {formData.lineItems.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors[`lineItem_${index}_description`]
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      placeholder="Item description"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors[`lineItem_${index}_quantity`]
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)
                      }
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors[`lineItem_${index}_rate`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.taxRate}
                      onChange={(e) =>
                        updateLineItem(index, 'taxRate', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.discountRate}
                      onChange={(e) =>
                        updateLineItem(index, 'discountRate', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-medium">
                    {formData.currency === 'INR' ? '₹' : '$'}
                    {item.lineTotal.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <button
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-800 transition"
                      disabled={formData.lineItems.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="mt-4 flex justify-end">
          <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-medium">
                {formData.currency === 'INR' ? '₹' : '$'}
                {totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Tax:</span>
              <span className="font-medium">
                {formData.currency === 'INR' ? '₹' : '$'}
                {totals.taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Discount:</span>
              <span className="font-medium text-green-600">
                -{formData.currency === 'INR' ? '₹' : '$'}
                {totals.discountAmount.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-800">Total:</span>
                <span className="text-lg font-bold text-blue-600">
                  {formData.currency === 'INR' ? '₹' : '$'}
                  {totals.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          onClick={() => handleSubmit(true)}
          className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50"
          disabled={isLoading}
        >
          <Save size={16} />
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit(false)}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          disabled={isLoading}
        >
          <Send size={16} />
          {isLoading ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  );
}
