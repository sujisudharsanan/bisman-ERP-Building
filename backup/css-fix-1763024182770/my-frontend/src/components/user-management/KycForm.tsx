'use client';

import React, { useState, useRef } from 'react';
import { 
  User, Mail, Phone, Calendar, MapPin, FileText, Upload, 
  Plus, Trash2, Save, AlertCircle, CheckCircle, Home, 
  GraduationCap, Briefcase, Users, Shield, Eye, EyeOff 
} from 'lucide-react';
import type { 
  KycFormData, 
  Qualification, 
  EmploymentHistory, 
  FamilyDetail,
  Invitation,
  BLOOD_GROUPS 
} from '@/types/user-management';

interface KycFormProps {
  invitation: Invitation;
  token: string;
  onSuccess?: () => void;
}

export function KycForm({ invitation, token, onSuccess }: KycFormProps) {
  const [formData, setFormData] = useState<KycFormData>({
    // Pre-fill from invitation
    first_name: invitation.invitee_name.split(' ')[0] || '',
    last_name: invitation.invitee_name.split(' ').slice(1).join(' ') || '',
    personal_email: invitation.invitee_email,
    phone: invitation.phone || '',
    qualifications: [{ degree: '', institution: '', year: new Date().getFullYear() }],
    employment_history: [{ 
      company: '', 
      designation: '', 
      from_date: '', 
      to_date: '' 
    }],
    family_details: [{ name: '', relationship: 'Father', contact: '' }],
    consent_given: false,
    terms_accepted: false,
    custom_fields: {},
  });

  const [files, setFiles] = useState<{
    profile_picture?: File;
    aadhaar_doc?: File;
    address_proof?: File;
    certificates?: File[];
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);

  // File input refs
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const aadhaarDocRef = useRef<HTMLInputElement>(null);
  const addressProofRef = useRef<HTMLInputElement>(null);
  const certificatesRef = useRef<HTMLInputElement>(null);

  const totalSteps = 5;

  const handleInputChange = (field: keyof KycFormData, value: any) => {
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
      case 1: // Personal Information
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.personal_email.trim()) newErrors.personal_email = 'Email is required';
        if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required';
        break;

      case 2: // Address Information
        if (!formData.communication_address?.trim()) {
          newErrors.communication_address = 'Communication address is required';
        }
        if (!formData.city?.trim()) newErrors.city = 'City is required';
        if (!formData.state?.trim()) newErrors.state = 'State is required';
        if (!formData.country?.trim()) newErrors.country = 'Country is required';
        break;

      case 3: // Identity Documents
        if (!formData.aadhaar_number?.trim()) {
          newErrors.aadhaar_number = 'Aadhaar number is required';
        } else if (!/^\d{12}$/.test(formData.aadhaar_number)) {
          newErrors.aadhaar_number = 'Aadhaar number must be 12 digits';
        }
        break;

      case 4: // Education & Employment
        formData.qualifications.forEach((qual, index) => {
          if (!qual.degree.trim()) {
            newErrors[`qualification_degree_${index}`] = 'Degree is required';
          }
          if (!qual.institution.trim()) {
            newErrors[`qualification_institution_${index}`] = 'Institution is required';
          }
        });
        break;

      case 5: // Compliance & Files
        if (!formData.consent_given) {
          newErrors.consent_given = 'Consent is required to proceed';
        }
        if (!formData.terms_accepted) {
          newErrors.terms_accepted = 'You must accept the terms and conditions';
        }
        if (!files.profile_picture) {
          newErrors.profile_picture = 'Profile picture is required';
        }
        if (!files.aadhaar_doc) {
          newErrors.aadhaar_doc = 'Aadhaar document is required';
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

      // Submit KYC data
      const response = await fetch(`/api/invite/${token}/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          files: uploadedFiles,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.();
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ submit: data.message || 'Failed to submit KYC form' });
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
    formData.append('owner_type', 'kyc_submission');

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
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
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
                  Personal Email *
                </label>
                <input
                  type="email"
                  value={formData.personal_email}
                  onChange={(e) => handleInputChange('personal_email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.personal_email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.personal_email && (
                  <p className="text-red-600 text-sm mt-1">{errors.personal_email}</p>
                )}
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
                About Me
              </label>
              <textarea
                value={formData.about_me || ''}
                onChange={(e) => handleInputChange('about_me', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Home className="w-6 h-6 text-blue-600" />
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
                  placeholder="Permanent address (if different from communication address)"
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
          </div>
        );

      case 3:
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

            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Security Notice</h4>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Your identity documents are encrypted and stored securely. They will only be 
                  accessed by authorized personnel for verification purposes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Number *
                </label>
                <input
                  type={showSensitiveFields ? 'text' : 'password'}
                  value={formData.aadhaar_number || ''}
                  onChange={(e) => handleInputChange('aadhaar_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.aadhaar_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter 12-digit Aadhaar number"
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
                  placeholder="Enter driving license number (if applicable)"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            {/* Education */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Education</h3>
              </div>

              <div className="space-y-4">
                {formData.qualifications.map((qual, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Qualification {index + 1}</h4>
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
                          Degree *
                        </label>
                        <input
                          type="text"
                          value={qual.degree}
                          onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`qualification_degree_${index}`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="B.Tech, MBA, etc."
                        />
                        {errors[`qualification_degree_${index}`] && (
                          <p className="text-red-600 text-sm mt-1">{errors[`qualification_degree_${index}`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Institution *
                        </label>
                        <input
                          type="text"
                          value={qual.institution}
                          onChange={(e) => handleQualificationChange(index, 'institution', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`qualification_institution_${index}`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="University/College name"
                        />
                        {errors[`qualification_institution_${index}`] && (
                          <p className="text-red-600 text-sm mt-1">{errors[`qualification_institution_${index}`]}</p>
                        )}
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
            </div>

            {/* Employment History */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Briefcase className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Employment History</h3>
              </div>

              <div className="space-y-4">
                {formData.employment_history.map((emp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Employment {index + 1}</h4>
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
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Family Details</h3>
              </div>

              <div className="space-y-4">
                {formData.family_details.map((family, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Family Member {index + 1}</h4>
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
        );

      case 5:
        return (
          <div className="space-y-8">
            {/* File Uploads */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Upload className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Document Uploads</h3>
              </div>

              <div className="space-y-6">
                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    {files.profile_picture ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={URL.createObjectURL(files.profile_picture)} 
                            alt="Profile" 
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium">{files.profile_picture.name}</p>
                            <p className="text-sm text-gray-500">
                              {(files.profile_picture.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile('profile_picture')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => profilePictureRef.current?.click()}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            Upload a photo
                          </button>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={profilePictureRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('profile_picture', e.target.files)}
                      className="hidden"
                    />
                  </div>
                  {errors.profile_picture && (
                    <p className="text-red-600 text-sm mt-1">{errors.profile_picture}</p>
                  )}
                </div>

                {/* Similar file upload sections for aadhaar_doc, address_proof, certificates */}
                {/* Aadhaar Document */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Document *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    {files.aadhaar_doc ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{files.aadhaar_doc.name}</p>
                            <p className="text-sm text-gray-500">
                              {(files.aadhaar_doc.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile('aadhaar_doc')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => aadhaarDocRef.current?.click()}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            Upload Aadhaar document
                          </button>
                          <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={aadhaarDocRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('aadhaar_doc', e.target.files)}
                      className="hidden"
                    />
                  </div>
                  {errors.aadhaar_doc && (
                    <p className="text-red-600 text-sm mt-1">{errors.aadhaar_doc}</p>
                  )}
                </div>

                {/* Address Proof */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Proof
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    {files.address_proof ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{files.address_proof.name}</p>
                            <p className="text-sm text-gray-500">
                              {(files.address_proof.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile('address_proof')}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => addressProofRef.current?.click()}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            Upload address proof
                          </button>
                          <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={addressProofRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('address_proof', e.target.files)}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Certificates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Educational/Professional Certificates
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    {files.certificates && files.certificates.length > 0 ? (
                      <div className="space-y-3">
                        {files.certificates.map((file, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-6 h-6 text-blue-600" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile('certificates', index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => certificatesRef.current?.click()}
                          className="text-blue-600 hover:text-blue-500 text-sm"
                        >
                          Add more certificates
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => certificatesRef.current?.click()}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            Upload certificates
                          </button>
                          <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 5MB each</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={certificatesRef}
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('certificates', e.target.files)}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Consent and Terms */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Consent and Terms</h4>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={formData.consent_given}
                    onChange={(e) => handleInputChange('consent_given', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700">
                    I consent to the collection, processing, and storage of my personal information 
                    for the purpose of employment verification and account creation. I understand 
                    that my data will be handled in accordance with applicable privacy laws.
                  </label>
                </div>
                {errors.consent_given && (
                  <p className="text-red-600 text-sm">{errors.consent_given}</p>
                )}

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.terms_accepted}
                    onChange={(e) => handleInputChange('terms_accepted', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I have read and agree to the{' '}
                    <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                      Terms and Conditions
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>.
                  </label>
                </div>
                {errors.terms_accepted && (
                  <p className="text-red-600 text-sm">{errors.terms_accepted}</p>
                )}
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700 font-medium">Submission Error</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Complete Your KYC</h1>
            <p className="text-gray-600 mt-2">
              Welcome, {invitation.invitee_name}! Please complete the Know Your Customer (KYC) 
              process to proceed with your account setup.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
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
          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Personal</span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>Address</span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>Identity</span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : ''}>Background</span>
            <span className={currentStep >= 5 ? 'text-blue-600 font-medium' : ''}>Documents</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Submit KYC</span>
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

export default KycForm;
