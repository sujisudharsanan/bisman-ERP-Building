'use client';

import React, { useState, useEffect } from 'react';
import {
  FiArrowLeft,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiBriefcase,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCreditCard,
} from 'react-icons/fi';
import Link from 'next/link';

interface BusinessType {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

interface FormData {
  // Business Info
  business_name: string;
  business_slug: string;
  business_type_id: string;
  
  // Admin Info
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  pincode: string;
  
  // Business Details
  gst_number: string;
  pan_number: string;
  website: string;
  
  // Subscription
  subscription_plan: string;
  max_users: number;
  max_storage_gb: number;
}

export default function CreateSuperAdminPage() {
  const [formData, setFormData] = useState<FormData>({
    business_name: '',
    business_slug: '',
    business_type_id: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    website: '',
    subscription_plan: 'professional',
    max_users: 25,
    max_storage_gb: 10,
  });

  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Mock business types
  const mockBusinessTypes: BusinessType[] = [
    {
      id: '1',
      name: 'Petrol Pump',
      slug: 'petrol-pump',
      description: 'Fuel station and retail management',
      icon: 'fuel',
    },
    {
      id: '2',
      name: 'Logistics',
      slug: 'logistics',
      description: 'Transportation and fleet management',
      icon: 'truck',
    },
    {
      id: '3',
      name: 'Restaurant',
      slug: 'restaurant',
      description: 'Food service management',
      icon: 'utensils',
    },
  ];

  useEffect(() => {
    // TODO: Fetch from API
    setBusinessTypes(mockBusinessTypes);
  }, []);

  // Auto-generate slug from business name
  useEffect(() => {
    if (formData.business_name && !formData.business_slug) {
      const slug = formData.business_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, business_slug: slug }));
    }
  }, [formData.business_name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.business_name.trim()) newErrors.business_name = 'Business name is required';
    if (!formData.business_slug.trim()) newErrors.business_slug = 'Business slug is required';
    if (!formData.business_type_id) newErrors.business_type_id = 'Business type is required';
    if (!formData.admin_name.trim()) newErrors.admin_name = 'Admin name is required';
    if (!formData.admin_email.trim()) newErrors.admin_email = 'Admin email is required';
    if (!formData.admin_phone.trim()) newErrors.admin_phone = 'Phone number is required';

    // Email validation
    if (formData.admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      newErrors.admin_email = 'Invalid email format';
    }

    // Phone validation
    if (formData.admin_phone && !/^\d{10}$/.test(formData.admin_phone)) {
      newErrors.admin_phone = 'Phone must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitError('Please fix all validation errors');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // TODO: Replace with actual API call
      console.log('Creating super admin:', formData);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSubmitSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        window.location.href = '/enterprise-admin/super-admins';
      }, 2000);
    } catch (error) {
      console.error('Error creating super admin:', error);
      setSubmitError('Failed to create super admin. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBusinessType = businessTypes.find((bt) => bt.id === formData.business_type_id);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/enterprise-admin/super-admins"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Super Admin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set up a new business instance
          </p>
        </div>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Super Admin created successfully!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Redirecting to super admins list...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {submitError}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Type Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiBriefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Business Type
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {businessTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, business_type_id: type.id }))}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.business_type_id === type.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{type.icon === 'fuel' ? '⛽' : type.icon === 'truck' ? '🚚' : '🍽️'}</div>
                <div className="font-medium text-gray-900 dark:text-white">{type.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
          {errors.business_type_id && (
            <p className="text-xs text-red-500 mt-2">{errors.business_type_id}</p>
          )}
        </div>

        {/* Business Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Business Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                  ${errors.business_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g., Rajesh Petrol Pump - Highway 44"
              />
              {errors.business_name && <p className="text-xs text-red-500 mt-1">{errors.business_name}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="business_slug"
                value={formData.business_slug}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                  ${errors.business_slug ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="rajesh-petrol-pump"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used in URLs and for identification (auto-generated from business name)
              </p>
              {errors.business_slug && <p className="text-xs text-red-500 mt-1">{errors.business_slug}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                GST Number
              </label>
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Admin Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiUser className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Super Admin Details
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="admin_name"
                value={formData.admin_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg
                  ${errors.admin_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Rajesh Kumar"
              />
              {errors.admin_name && <p className="text-xs text-red-500 mt-1">{errors.admin_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="admin_email"
                value={formData.admin_email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg
                  ${errors.admin_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="rajesh@example.com"
              />
              {errors.admin_email && <p className="text-xs text-red-500 mt-1">{errors.admin_email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="admin_phone"
                value={formData.admin_phone}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg
                  ${errors.admin_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="9876543210"
                maxLength={10}
              />
              {errors.admin_phone && <p className="text-xs text-red-500 mt-1">{errors.admin_phone}</p>}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiMapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Address
            </h2>
          </div>
          <div className="space-y-4">
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Complete address"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="City"
              />
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="State"
              />
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Pincode"
                maxLength={6}
              />
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiCreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Subscription
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plan
              </label>
              <select
                name="subscription_plan"
                value={formData.subscription_plan}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Users
              </label>
              <input
                type="number"
                name="max_users"
                value={formData.max_users}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Storage (GB)
              </label>
              <input
                type="number"
                name="max_storage_gb"
                value={formData.max_storage_gb}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/enterprise-admin/super-admins"
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
              transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
              transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating...' : 'Create Super Admin'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
