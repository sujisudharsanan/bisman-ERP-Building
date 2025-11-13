'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUserPlus,
  FiMapPin,
  FiPhone,
  FiMail,
  FiCreditCard,
  FiFileText,
  FiUpload,
  FiSave,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiCalendar,
  FiRepeat,
  FiHome,
} from 'react-icons/fi';
import FileUpload from '../components/FileUpload';
import {
  NonPrivilegedUserFormData,
  UploadedFiles,
  ROLE_TYPE_OPTIONS,
  GST_TYPE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  RECURRING_FREQUENCY_OPTIONS,
  FormErrors,
} from '../payment-types';

export default function NonPrivilegedUsersPage() {
  const [formData, setFormData] = useState<NonPrivilegedUserFormData>({
    full_name: '',
    business_name: '',
    role_type: '',
    gst_type: '',
    service_type: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_number: '',
    email: '',
    bank_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    pan_number: '',
    gst_number: '',
    remarks: '',
    is_recurring: false,
    recurring_start_date: '',
    recurring_end_date: '',
    recurring_amount: '',
    recurring_frequency: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-fill bank holder name from full name
  useEffect(() => {
    if (formData.full_name && !formData.bank_holder_name) {
      setFormData(prev => ({ ...prev, bank_holder_name: formData.full_name }));
    }
  }, [formData.full_name]);

  // Validate PAN format
  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    return panRegex.test(pan.toUpperCase());
  };

  // Validate IFSC format
  const validateIFSC = (ifsc: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  };

  // Validate GST format
  const validateGST = (gst: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.role_type) newErrors.role_type = 'Role type is required';
    if (!formData.gst_type) newErrors.gst_type = 'GST type is required';
    if (!formData.service_type) newErrors.service_type = 'Service type is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required';
    if (!formData.bank_holder_name.trim()) newErrors.bank_holder_name = 'Bank holder name is required';
    if (!formData.bank_name.trim()) newErrors.bank_name = 'Bank name is required';
    if (!formData.account_number.trim()) newErrors.account_number = 'Account number is required';
    if (!formData.ifsc_code.trim()) newErrors.ifsc_code = 'IFSC code is required';
    if (!formData.pan_number.trim()) newErrors.pan_number = 'PAN number is required';

    // Email validation (optional but must be valid if provided)
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // PAN validation
    if (formData.pan_number && !validatePAN(formData.pan_number)) {
      newErrors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // IFSC validation
    if (formData.ifsc_code && !validateIFSC(formData.ifsc_code)) {
      newErrors.ifsc_code = 'Invalid IFSC format (e.g., HDFC0001234)';
    }

    // GST validation (required if gst_type is 'with_gst')
    if (formData.gst_type === 'with_gst') {
      if (!formData.gst_number.trim()) {
        newErrors.gst_number = 'GST number is required for "With GST"';
      } else if (!validateGST(formData.gst_number)) {
        newErrors.gst_number = 'Invalid GST format';
      }
    }

    // Recurring payment validation
    if (formData.is_recurring) {
      if (!formData.recurring_start_date) newErrors.recurring_start_date = 'Start date is required';
      if (!formData.recurring_end_date) newErrors.recurring_end_date = 'End date is required';
      if (!formData.recurring_amount || parseFloat(formData.recurring_amount) <= 0) {
        newErrors.recurring_amount = 'Valid amount is required';
      }
      if (!formData.recurring_frequency) newErrors.recurring_frequency = 'Frequency is required';

      // Validate end date is after start date
      if (formData.recurring_start_date && formData.recurring_end_date) {
        const startDate = new Date(formData.recurring_start_date);
        const endDate = new Date(formData.recurring_end_date);
        if (endDate <= startDate) {
          newErrors.recurring_end_date = 'End date must be after start date';
        }
      }
    }

    // File validation
    if (!uploadedFiles.bank_passbook) newErrors.bank_passbook = 'Bank passbook is required';
    if (!uploadedFiles.photo) newErrors.photo = 'Photo is required';
    if (!uploadedFiles.pan_card) newErrors.pan_card = 'PAN card is required';

    if (formData.gst_type === 'with_gst' && !uploadedFiles.gst_certificate) {
      newErrors.gst_certificate = 'GST certificate is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileUpload = (fieldName: keyof UploadedFiles, fileUrl: string) => {
    setUploadedFiles(prev => ({ ...prev, [fieldName]: fileUrl }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitError('Please fix all validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/payment/non-privileged-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          uploaded_files: uploadedFiles,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        full_name: '',
        business_name: '',
        role_type: '',
        gst_type: '',
        service_type: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contact_number: '',
        email: '',
        bank_holder_name: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        upi_id: '',
        pan_number: '',
        gst_number: '',
        remarks: '',
        is_recurring: false,
        recurring_start_date: '',
        recurring_end_date: '',
        recurring_amount: '',
        recurring_frequency: '',
      });
      setUploadedFiles({});

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error creating user:', error);
      setSubmitError('Failed to create user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      full_name: '',
      business_name: '',
      role_type: '',
      gst_type: '',
      service_type: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_number: '',
      email: '',
      bank_holder_name: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      upi_id: '',
      pan_number: '',
      gst_number: '',
      remarks: '',
      is_recurring: false,
      recurring_start_date: '',
      recurring_end_date: '',
      recurring_amount: '',
      recurring_frequency: '',
    });
    setUploadedFiles({});
    setErrors({});
    setSubmitError('');
    setSubmitSuccess(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiUserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Non-Privileged Users
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Register vendors, building owners, and creditors
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  User created successfully!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  The user has been submitted for manager approval.
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

        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiHome className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter full name"
              />
              {errors.full_name && (
                <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Name
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter business name (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role Type <span className="text-red-500">*</span>
              </label>
              <select
                name="role_type"
                value={formData.role_type}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.role_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select role type</option>
                {ROLE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.role_type && (
                <p className="text-xs text-red-500 mt-1">{errors.role_type}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                GST Type <span className="text-red-500">*</span>
              </label>
              <select
                name="gst_type"
                value={formData.gst_type}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.gst_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select GST type</option>
                {GST_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.gst_type && (
                <p className="text-xs text-red-500 mt-1">{errors.gst_type}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.service_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select service type</option>
                {SERVICE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.service_type && (
                <p className="text-xs text-red-500 mt-1">{errors.service_type}</p>
              )}
            </div>

            {formData.gst_type === 'with_gst' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.gst_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase`}
                  placeholder="e.g., 22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {errors.gst_number && (
                  <p className="text-xs text-red-500 mt-1">{errors.gst_number}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.pan_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase`}
                placeholder="e.g., ABCDE1234F"
                maxLength={10}
              />
              {errors.pan_number && (
                <p className="text-xs text-red-500 mt-1">{errors.pan_number}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiMapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contact Information
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter complete address"
              />
              {errors.address && (
                <p className="text-xs text-red-500 mt-1">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="City"
                />
                {errors.city && (
                  <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.state ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="State"
                />
                {errors.state && (
                  <p className="text-xs text-red-500 mt-1">{errors.state}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.pincode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Pincode"
                  maxLength={6}
                />
                {errors.pincode && (
                  <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.contact_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
                {errors.contact_number && (
                  <p className="text-xs text-red-500 mt-1">{errors.contact_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="email@example.com (optional)"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiCreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bank Details
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_holder_name"
                value={formData.bank_holder_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.bank_holder_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="As per bank account"
              />
              {errors.bank_holder_name && (
                <p className="text-xs text-red-500 mt-1">{errors.bank_holder_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.bank_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g., HDFC Bank"
              />
              {errors.bank_name && (
                <p className="text-xs text-red-500 mt-1">{errors.bank_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.account_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Bank account number"
              />
              {errors.account_number && (
                <p className="text-xs text-red-500 mt-1">{errors.account_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.ifsc_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase`}
                placeholder="e.g., HDFC0001234"
                maxLength={11}
              />
              {errors.ifsc_code && (
                <p className="text-xs text-red-500 mt-1">{errors.ifsc_code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                UPI ID
              </label>
              <input
                type="text"
                name="upi_id"
                value={formData.upi_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="name@upi (optional)"
              />
            </div>
          </div>
        </div>

        {/* Document Uploads */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiUpload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Document Uploads
            </h2>
          </div>
          <div className="space-y-4">
            <FileUpload
              label="Bank Passbook"
              value={uploadedFiles.bank_passbook}
              onChange={(url) => handleFileUpload('bank_passbook', url)}
              required
              helpText="First page of bank passbook with account details"
            />

            <FileUpload
              label="Contract/Agreement"
              value={uploadedFiles.contract}
              onChange={(url) => handleFileUpload('contract', url)}
              helpText="Service contract or agreement (if applicable)"
            />

            <FileUpload
              label="Photo"
              value={uploadedFiles.photo}
              onChange={(url) => handleFileUpload('photo', url)}
              accept=".jpg,.jpeg,.png"
              required
              helpText="Passport size photo"
            />

            <FileUpload
              label="PAN Card"
              value={uploadedFiles.pan_card}
              onChange={(url) => handleFileUpload('pan_card', url)}
              required
              helpText="Clear copy of PAN card"
            />

            {formData.gst_type === 'with_gst' && (
              <FileUpload
                label="GST Certificate"
                value={uploadedFiles.gst_certificate}
                onChange={(url) => handleFileUpload('gst_certificate', url)}
                required
                helpText="GST registration certificate"
              />
            )}
          </div>

          {(errors.bank_passbook || errors.photo || errors.pan_card || errors.gst_certificate) && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                Please upload all required documents before submitting.
              </p>
            </div>
          )}
        </div>

        {/* Recurring Payment */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiRepeat className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recurring Payment
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <input
                type="checkbox"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable recurring payment
              </label>
            </div>

            {formData.is_recurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="recurring_start_date"
                    value={formData.recurring_start_date}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${errors.recurring_start_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  />
                  {errors.recurring_start_date && (
                    <p className="text-xs text-red-500 mt-1">{errors.recurring_start_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="recurring_end_date"
                    value={formData.recurring_end_date}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${errors.recurring_end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  />
                  {errors.recurring_end_date && (
                    <p className="text-xs text-red-500 mt-1">{errors.recurring_end_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="recurring_amount"
                    value={formData.recurring_amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${errors.recurring_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    placeholder="0.00"
                  />
                  {errors.recurring_amount && (
                    <p className="text-xs text-red-500 mt-1">{errors.recurring_amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="recurring_frequency"
                    value={formData.recurring_frequency}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${errors.recurring_frequency ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  >
                    <option value="">Select frequency</option>
                    {RECURRING_FREQUENCY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.recurring_frequency && (
                    <p className="text-xs text-red-500 mt-1">{errors.recurring_frequency}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FiFileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Additional Information
            </h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Any additional information or notes..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
              transition-colors duration-200 flex items-center space-x-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiX className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
              transition-colors duration-200 flex items-center space-x-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit for Approval'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
