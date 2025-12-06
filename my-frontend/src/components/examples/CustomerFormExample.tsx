/**
 * Customer Form Component with Zod Validation
 * 
 * Example implementation showing how to use:
 * - React Hook Form with zodResolver
 * - Shared validation schemas (same as backend)
 * - Indian ERP patterns (GSTIN, PAN, phone)
 * - Error handling and display
 * 
 * This ensures frontend and backend use the SAME validation rules!
 */

'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// =============================================================================
// SHARED SCHEMAS (in production, import from @/shared/validation)
// =============================================================================

// Common schemas - same as backend
const gstinSchema = z
  .string()
  .regex(/^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g., ABCDE1234F)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s-]/g, ''))
  .refine(v => !v || /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v), {
    message: 'Invalid Indian phone number (10 digits starting with 6-9)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

const emailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal('').transform(() => undefined));

const pinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const creditLimitSchema = z
  .number()
  .min(0, 'Credit limit cannot be negative')
  .max(100000000, 'Credit limit too high (max ₹10 crore)')
  .optional();

// Customer Create Schema - SAME as backend
const customerCreateSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200, 'Name too long'),
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  gstin: gstinSchema,
  pan: panSchema,
  customerType: z.enum(['individual', 'business', 'government', 'ngo']).default('business'),
  creditLimit: z.coerce.number().min(0).max(100000000).optional().or(z.literal('').transform(() => undefined)),
  creditDays: z.coerce.number().int().min(0).max(365).optional().or(z.literal('').transform(() => undefined)),
  billingAddress: z.object({
    line1: z.string().min(1, 'Address line 1 required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City required'),
    state: z.string().min(1, 'State required'),
    pinCode: pinCodeSchema,
    country: z.string().default('India'),
  }).optional(),
  notes: z.string().max(1000, 'Notes too long (max 1000 characters)').optional(),
});

// Infer TypeScript type from schema
type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

// =============================================================================
// CUSTOMER FORM COMPONENT
// =============================================================================

interface CustomerFormProps {
  onSuccess?: (customer: any) => void;
  onCancel?: () => void;
  initialData?: Partial<CustomerCreateInput>;
  mode?: 'create' | 'edit';
}

export default function CustomerFormExample({
  onSuccess,
  onCancel,
  initialData,
  mode = 'create',
}: CustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Initialize React Hook Form with Zod resolver
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
    reset,
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      gstin: '',
      pan: '',
      customerType: 'business',
      creditLimit: undefined,
      creditDays: undefined,
      billingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pinCode: '',
        country: 'India',
      },
      notes: '',
      ...initialData,
    },
  });

  // Handle form submission
  const onSubmit = async (data: CustomerCreateInput) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const url = mode === 'create' ? '/api/customers' : `/api/customers/${(initialData as any)?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (result.error === 'VALIDATION_ERROR' && result.errors) {
          // Map backend errors to form fields
          result.errors.forEach((err: any) => {
            setError(err.field as any, {
              type: 'server',
              message: err.message,
            });
          });
          return;
        }

        // Handle other errors
        setServerError(result.message || 'Something went wrong');
        return;
      }

      // Success!
      onSuccess?.(result.data);
      if (mode === 'create') {
        reset(); // Clear form on create
      }
    } catch (err) {
      setServerError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Indian states for dropdown
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Server Error Alert */}
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {serverError}
        </div>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Name */}
        <div className="col-span-2 md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            type="text"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter customer name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Customer Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Type
          </label>
          <select
            {...register('customerType')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="business">Business</option>
            <option value="individual">Individual</option>
            <option value="government">Government</option>
            <option value="ngo">NGO</option>
          </select>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="email@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            {...register('phone')}
            type="tel"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="9876543210"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Tax Information */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GSTIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GSTIN
              <span className="text-gray-400 text-xs ml-2">(15 characters)</span>
            </label>
            <input
              {...register('gstin')}
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                errors.gstin ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
            {errors.gstin && (
              <p className="mt-1 text-sm text-red-500">{errors.gstin.message}</p>
            )}
          </div>

          {/* PAN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN
              <span className="text-gray-400 text-xs ml-2">(10 characters)</span>
            </label>
            <input
              {...register('pan')}
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                errors.pan ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
            {errors.pan && (
              <p className="mt-1 text-sm text-red-500">{errors.pan.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Credit Information */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Credit Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credit Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Limit (₹)
            </label>
            <input
              {...register('creditLimit')}
              type="number"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.creditLimit ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="100000"
              min={0}
              max={100000000}
            />
            {errors.creditLimit && (
              <p className="mt-1 text-sm text-red-500">{errors.creditLimit.message}</p>
            )}
          </div>

          {/* Credit Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Days
            </label>
            <input
              {...register('creditDays')}
              type="number"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.creditDays ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="30"
              min={0}
              max={365}
            />
            {errors.creditDays && (
              <p className="mt-1 text-sm text-red-500">{errors.creditDays.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Address Line 1 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 1
            </label>
            <input
              {...register('billingAddress.line1')}
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.billingAddress?.line1 ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Building, Street"
            />
            {errors.billingAddress?.line1 && (
              <p className="mt-1 text-sm text-red-500">{errors.billingAddress.line1.message}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 2
            </label>
            <input
              {...register('billingAddress.line2')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Area, Landmark"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              {...register('billingAddress.city')}
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.billingAddress?.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="City"
            />
            {errors.billingAddress?.city && (
              <p className="mt-1 text-sm text-red-500">{errors.billingAddress.city.message}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              {...register('billingAddress.state')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.billingAddress?.state ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select State</option>
              {indianStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.billingAddress?.state && (
              <p className="mt-1 text-sm text-red-500">{errors.billingAddress.state.message}</p>
            )}
          </div>

          {/* PIN Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN Code
            </label>
            <input
              {...register('billingAddress.pinCode')}
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.billingAddress?.pinCode ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="600001"
              maxLength={6}
            />
            {errors.billingAddress?.pinCode && (
              <p className="mt-1 text-sm text-red-500">{errors.billingAddress.pinCode.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.notes ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Additional notes about this customer..."
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Customer' : 'Update Customer'}
        </button>
      </div>
    </form>
  );
}
