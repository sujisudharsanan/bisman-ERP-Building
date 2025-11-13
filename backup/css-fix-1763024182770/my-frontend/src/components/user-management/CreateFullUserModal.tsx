'use client';

import React, { useState, useRef } from 'react';
import { 
  X, User, Mail, Phone, Save, Plus, Trash2, Upload, 
  FileText, Building, Shield, GraduationCap, Users,
  CheckCircle, AlertCircle, Eye, EyeOff, MapPin,
  Crown, Key, Calendar
} from 'lucide-react';
import type { 
  CreateUserData, 
  UserRole, 
  Branch,
  Qualification,
  EmploymentHistory,
  FamilyDetail
} from '@/types/user-management';

interface CreateFullUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: UserRole[];
  branches: Branch[];
}

export function CreateFullUserModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  roles, 
  branches 
}: CreateFullUserModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);

  const [formData, setFormData] = useState<CreateUserData>({
    // Basic user data
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    password: '',
    confirm_password: '',
    designation: '',
    department: '',
    employee_id: '',
    branch_id: '',
    role_ids: [],
    status: 'active',

    // KYC data
    personal_email: '',
    date_of_birth: '',
    blood_group: '',
    about_me: '',
    communication_address: '',
    permanent_address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    aadhaar_number: '',
    license_number: '',
    qualifications: [{ degree: '', institution: '', year: new Date().getFullYear() }],
    employment_history: [{ company: '', designation: '', from_date: '', to_date: '' }],
    family_details: [{ name: '', relationship: 'Father', contact: '' }],
    custom_fields: {},
    
    // Consent (required for KYC)
    consent_given: false,
    terms_accepted: false,
  });

  const [files, setFiles] = useState<{
    profile_picture?: File;
    aadhaar_doc?: File;
    address_proof?: File;
    certificates?: File[];
  }>({});

  // File input refs
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const aadhaarDocRef = useRef<HTMLInputElement>(null);
  const addressProofRef = useRef<HTMLInputElement>(null);
  const certificatesRef = useRef<HTMLInputElement>(null);

  const totalSteps = 6;

  const handleInputChange = (field: keyof CreateUserData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleQualificationChange = (index: number, field: keyof Qualification, value: string | number) => {
    const newQualifications = [...formData.qualifications];
    newQualifications[index] = { ...newQualifications[index], [field]: value };
    handleInputChange('qualifications', newQualifications);
  };

  const addQualification = () => {
    handleInputChange('qualifications', [
      ...formData.qualifications,
      { degree: '', institution: '', year: new Date().getFullYear() }
    ]);
  };

  const removeQualification = (index: number) => {
    if (formData.qualifications.length > 1) {
      const newQualifications = formData.qualifications.filter((_, i) => i !== index);
      handleInputChange('qualifications', newQualifications);
    }
  };

  const handleEmploymentChange = (index: number, field: keyof EmploymentHistory, value: string) => {
    const newEmployment = [...formData.employment_history];
    newEmployment[index] = { ...newEmployment[index], [field]: value };
    handleInputChange('employment_history', newEmployment);
  };

  const addEmployment = () => {
    handleInputChange('employment_history', [
      ...formData.employment_history,
      { company: '', designation: '', from_date: '', to_date: '' }
    ]);
  };

  const removeEmployment = (index: number) => {
    if (formData.employment_history.length > 1) {
      const newEmployment = formData.employment_history.filter((_, i) => i !== index);
      handleInputChange('employment_history', newEmployment);
    }
  };

  const handleFamilyChange = (index: number, field: keyof FamilyDetail, value: string) => {
    const newFamily = [...formData.family_details];
    newFamily[index] = { ...newFamily[index], [field]: value };
    handleInputChange('family_details', newFamily);
  };

  const addFamilyMember = () => {
    handleInputChange('family_details', [
      ...formData.family_details,
      { name: '', relationship: 'Father', contact: '' }
    ]);
  };

  const removeFamilyMember = (index: number) => {
    if (formData.family_details.length > 1) {
      const newFamily = formData.family_details.filter((_, i) => i !== index);
      handleInputChange('family_details', newFamily);
    }
  };

  const handleFileChange = (type: keyof typeof files, selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    if (type === 'certificates') {
      const currentCertificates = files.certificates || [];
      const newCertificates = [...currentCertificates, ...Array.from(selectedFiles)];
      setFiles(prev => ({ ...prev, certificates: newCertificates }));
    } else {
      const file = selectedFiles[0];
      if (file) {
        setFiles(prev => ({ ...prev, [type]: file }));
      }
    }
  };

  const removeFile = (type: keyof typeof files, index?: number) => {
    if (type === 'certificates' && typeof index === 'number') {
      const newCertificates = (files.certificates || []).filter((_, i) => i !== index);
      setFiles(prev => ({ ...prev, certificates: newCertificates }));
    } else {
      setFiles(prev => ({ ...prev, [type]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Account Details
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password !== formData.confirm_password) {
          newErrors.confirm_password = 'Passwords do not match';
        }
        if (formData.role_ids.length === 0) newErrors.role_ids = 'At least one role is required';
        break;

      case 2: // Personal Info
        if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required';
        break;

      case 3: // Address
        if (!formData.communication_address?.trim()) {
          newErrors.communication_address = 'Communication address is required';
        }
        if (!formData.city?.trim()) newErrors.city = 'City is required';
        if (!formData.state?.trim()) newErrors.state = 'State is required';
        if (!formData.country?.trim()) newErrors.country = 'Country is required';
        break;

      case 4: // Identity
        // Aadhaar is optional for admin creation
        if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number)) {
          newErrors.aadhaar_number = 'Aadhaar number must be 12 digits';
        }
        break;

      case 5: // Background (optional validation)
        // Education and employment are optional
        break;

      case 6: // Final Review
        if (!formData.consent_given) {
          newErrors.consent_given = 'Consent is required to create account';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(totalSteps)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // First, upload files
      const uploadedFiles: Record<string, string> = {};

      for (const [type, file] of Object.entries(files)) {
        if (file) {
          if (type === 'certificates' && Array.isArray(file)) {
            const uploadedCertificates = [];
            for (const cert of file) {
              const fileKey = await uploadFile(cert, 'certificate');
              uploadedCertificates.push(fileKey);
            }
            uploadedFiles.certificates = JSON.stringify(uploadedCertificates);
          } else if (file instanceof File) {
            const fileKey = await uploadFile(file, type);
            uploadedFiles[type] = fileKey;
          }
        }
      }

      // Create user with KYC data
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          files: uploadedFiles,
          create_with_kyc: true, // Flag to indicate full user creation
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ submit: data.message || 'Failed to create user' });
        }
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadFile = async (file: File, type: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('owner_type', 'user');

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${type}`);
    }

    const data = await response.json();
    return data.file_key;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.first_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.first_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.last_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.last_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    handleInputChange('email', e.target.value);
                    // Auto-fill personal_email if not set
                    if (!formData.personal_email) {
                      handleInputChange('personal_email', e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employee_id || ''}
                  onChange={(e) => handleInputChange('employee_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirm_password ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.confirm_password && (
                  <p className="text-red-600 text-sm mt-1">{errors.confirm_password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <select
                value={formData.branch_id || ''}
                onChange={(e) => handleInputChange('branch_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roles *
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                {roles.map(role => (
                  <label key={role.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.role_ids.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('role_ids', [...formData.role_ids, role.id]);
                        } else {
                          handleInputChange('role_ids', formData.role_ids.filter(id => id !== role.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{role.name}</span>
                    {role.description && (
                      <span className="text-xs text-gray-500">({role.description})</span>
                    )}
                  </label>
                ))}
              </div>
              {errors.role_ids && (
                <p className="text-red-600 text-sm mt-1">{errors.role_ids}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Email
                </label>
                <input
                  type="email"
                  value={formData.personal_email || ''}
                  onChange={(e) => handleInputChange('personal_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Same as work email if not different"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={formData.alternate_phone || ''}
                  onChange={(e) => handleInputChange('alternate_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Group
                </label>
                <select
                  value={formData.blood_group || ''}
                  onChange={(e) => handleInputChange('blood_group', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About
              </label>
              <textarea
                value={formData.about_me || ''}
                onChange={(e) => handleInputChange('about_me', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description about the user..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <MapPin className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Address *
                </label>
                <textarea
                  value={formData.communication_address || ''}
                  onChange={(e) => handleInputChange('communication_address', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.communication_address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Current residential address"
                />
                {errors.communication_address && (
                  <p className="text-red-600 text-sm mt-1">{errors.communication_address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permanent Address
                </label>
                <textarea
                  value={formData.permanent_address || ''}
                  onChange={(e) => handleInputChange('permanent_address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Permanent address (if different)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.city && (
                    <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.state ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.state && (
                    <p className="text-red-600 text-sm mt-1">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    value={formData.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.country ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select country</option>
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                  </select>
                  {errors.country && (
                    <p className="text-red-600 text-sm mt-1">{errors.country}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.postal_code || ''}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Identity Documents</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSensitiveFields(!showSensitiveFields)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {showSensitiveFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showSensitiveFields ? 'Hide' : 'Show'} sensitive fields</span>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-800">Admin Note</h4>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                Identity documents are optional during admin creation. Users can upload them later 
                during their profile completion or KYC process.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Number
                </label>
                <input
                  type={showSensitiveFields ? 'text' : 'password'}
                  value={formData.aadhaar_number || ''}
                  onChange={(e) => handleInputChange('aadhaar_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.aadhaar_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter 12-digit Aadhaar number (optional)"
                  maxLength={12}
                />
                {errors.aadhaar_number && (
                  <p className="text-red-600 text-sm mt-1">{errors.aadhaar_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driving License Number
                </label>
                <input
                  type="text"
                  value={formData.license_number || ''}
                  onChange={(e) => handleInputChange('license_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter driving license number (optional)"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            {/* Education */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Education & Employment</h3>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Education</h4>
                {formData.qualifications.map((qual, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="font-medium text-gray-900">Qualification {index + 1}</h5>
                      {formData.qualifications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQualification(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Degree
                        </label>
                        <input
                          type="text"
                          value={qual.degree}
                          onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="B.Tech, MBA, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={qual.institution}
                          onChange={(e) => handleQualificationChange(index, 'institution', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="University/College name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year
                        </label>
                        <input
                          type="number"
                          value={qual.year}
                          onChange={(e) => handleQualificationChange(index, 'year', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1950"
                          max={new Date().getFullYear() + 10}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addQualification}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Qualification</span>
                </button>
              </div>

              {/* Employment History */}
              <div className="mt-8">
                <h4 className="font-medium text-gray-900 mb-4">Employment History</h4>
                <div className="space-y-4">
                  {formData.employment_history.map((emp, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-medium text-gray-900">Employment {index + 1}</h5>
                        {formData.employment_history.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmployment(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Company
                          </label>
                          <input
                            type="text"
                            value={emp.company}
                            onChange={(e) => handleEmploymentChange(index, 'company', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Company name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Designation
                          </label>
                          <input
                            type="text"
                            value={emp.designation}
                            onChange={(e) => handleEmploymentChange(index, 'designation', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Job title"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            From Date
                          </label>
                          <input
                            type="date"
                            value={emp.from_date}
                            onChange={(e) => handleEmploymentChange(index, 'from_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            To Date
                          </label>
                          <input
                            type="date"
                            value={emp.to_date || ''}
                            onChange={(e) => handleEmploymentChange(index, 'to_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Leave empty if current job</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addEmployment}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Employment History</span>
                  </button>
                </div>
              </div>

              {/* Family Details */}
              <div className="mt-8">
                <h4 className="font-medium text-gray-900 mb-4">Family Details</h4>
                <div className="space-y-4">
                  {formData.family_details.map((family, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-medium text-gray-900">Family Member {index + 1}</h5>
                        {formData.family_details.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFamilyMember(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={family.name}
                            onChange={(e) => handleFamilyChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Full name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Relationship
                          </label>
                          <select
                            value={family.relationship}
                            onChange={(e) => handleFamilyChange(index, 'relationship', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Son">Son</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Brother">Brother</option>
                            <option value="Sister">Sister</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact
                          </label>
                          <input
                            type="tel"
                            value={family.contact || ''}
                            onChange={(e) => handleFamilyChange(index, 'contact', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addFamilyMember}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Family Member</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Review & Create</h3>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Account Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{formData.first_name} {formData.last_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{formData.email}</span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">{formData.phone}</span>
                </div>
                <div>
                  <span className="text-gray-600">Roles:</span>
                  <span className="ml-2 font-medium">
                    {roles.filter(role => formData.role_ids.includes(role.id)).map(role => role.name).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Branch:</span>
                  <span className="ml-2 font-medium">
                    {formData.branch_id ? branches.find(b => b.id === formData.branch_id)?.name || 'Unknown' : 'Not assigned'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 font-medium capitalize">{formData.status}</span>
                </div>
              </div>
            </div>

            {/* Consent */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="font-medium text-yellow-800 mb-4">Data Processing Consent</h4>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="admin_consent"
                    checked={formData.consent_given}
                    onChange={(e) => handleInputChange('consent_given', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="admin_consent" className="text-sm text-yellow-700">
                    I confirm that appropriate consent has been obtained from the user for 
                    processing their personal information. The user has been informed about 
                    data collection and processing purposes.
                  </label>
                </div>
                {errors.consent_given && (
                  <p className="text-red-600 text-sm">{errors.consent_given}</p>
                )}
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700 font-medium">Creation Error</p>
                </div>
                <p className="text-red-600 text-sm mt-1">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
              <p className="text-sm text-gray-500">
                Complete user account with KYC information
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Labels */}
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Account</span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>Personal</span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>Address</span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : ''}>Identity</span>
            <span className={currentStep >= 5 ? 'text-blue-600 font-medium' : ''}>Background</span>
            <span className={currentStep >= 6 ? 'text-blue-600 font-medium' : ''}>Review</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {currentStep === totalSteps ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating User...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create User</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateFullUserModal;
