'use client';

/**
 * Branding Setup Page
 * 
 * After selecting a subscription plan, users come here to:
 * - Upload their company logo
 * - Set their display name
 * - Complete workspace activation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Upload,
  ImageIcon,
  Building2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  X,
  Sparkles,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

interface SelectedPlan {
  id: string;
  code: string;
  name: string;
  price_monthly: number;
}

export default function BrandingSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; logo?: string }>({});

  useEffect(() => {
    // Retrieve selected plan from session storage
    const storedPlan = sessionStorage.getItem('selectedPlan');
    if (storedPlan) {
      try {
        setSelectedPlan(JSON.parse(storedPlan));
      } catch {
        // If parsing fails, redirect back to welcome
        router.push('/welcome');
      }
    } else {
      // No plan selected, redirect back
      router.push('/welcome');
    }
  }, [router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, logo: 'Please upload a PNG, JPG, SVG, or WebP image' }));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'Logo must be less than 2MB' }));
      return;
    }

    setLogoFile(file);
    setErrors(prev => ({ ...prev, logo: undefined }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors: { displayName?: string; logo?: string } = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    } else if (displayName.trim().length > 100) {
      newErrors.displayName = 'Display name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedPlan) return;

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('planCode', selectedPlan.code);
      formData.append('billingCycle', 'monthly');
      formData.append('displayName', displayName.trim());
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch(`${API_BASE}/api/welcome/activate`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        // Clear session storage
        sessionStorage.removeItem('selectedPlan');
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to activate workspace');
      }
    } catch (err) {
      console.error('Activation error:', err);
      alert('Failed to activate workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push('/welcome');
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-blue-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 relative overflow-hidden">
      {/* Background Graphics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-100/50 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-blue-100 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/bisman-logo.svg"
              alt="BISMAN ERP"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-blue-800">BISMAN ERP</h1>
              <p className="text-[10px] text-blue-500">Branding Setup</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{selectedPlan.name} Plan</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-sm text-blue-700 font-medium">Plan Selected</span>
          </div>
          <div className="w-12 h-0.5 bg-blue-300" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <span className="text-sm text-blue-700 font-medium">Branding</span>
          </div>
          <div className="w-12 h-0.5 bg-blue-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-400 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <span className="text-sm text-blue-400">Launch</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <h2 className="text-2xl font-bold mb-1">Setup Your Brand Identity</h2>
            <p className="text-blue-100 text-sm">
              Add your company logo and display name to personalize your workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-2">
                Company Logo <span className="text-blue-400 font-normal">(Optional)</span>
              </label>
              
              {logoPreview ? (
                <div className="relative w-32 h-32 border-2 border-blue-200 rounded-xl overflow-hidden bg-blue-50">
                  <Image
                    src={logoPreview}
                    alt="Logo Preview"
                    fill
                    className="object-contain p-2"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-700">Click to upload logo</p>
                    <p className="text-xs text-blue-400">PNG, JPG, SVG or WebP (max 2MB)</p>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {errors.logo && (
                <p className="mt-2 text-sm text-red-500">{errors.logo}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-blue-800 mb-2">
                Display Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errors.displayName) {
                      setErrors(prev => ({ ...prev, displayName: undefined }));
                    }
                  }}
                  placeholder="Enter your company or organization name"
                  className={`
                    w-full pl-10 pr-4 py-3 border-2 rounded-xl text-blue-800 placeholder-blue-300
                    focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all
                    ${errors.displayName ? 'border-red-300 focus:border-red-400' : 'border-blue-200 focus:border-blue-400'}
                  `}
                />
              </div>
              {errors.displayName ? (
                <p className="mt-2 text-sm text-red-500">{errors.displayName}</p>
              ) : (
                <p className="mt-2 text-xs text-blue-400">This name will appear in the header and reports</p>
              )}
            </div>

            {/* Preview */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-700 mb-3">Preview</p>
              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo"
                    width={36}
                    height={36}
                    className="rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  </div>
                )}
                <span className="font-semibold text-blue-800">
                  {displayName.trim() || 'Your Organization'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Plans
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all
                  bg-blue-600 text-white shadow-lg shadow-blue-300 hover:bg-blue-700 hover:shadow-xl hover:scale-105
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                `}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    Launch Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <p className="text-center mt-6 text-blue-400 text-xs">
          You can always update your branding from Settings after launching
        </p>
      </main>
    </div>
  );
}
