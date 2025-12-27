"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import API_BASE from '@/config/api';
import { RefreshCw, Upload, X, FileText, Building2, Globe, CreditCard, Users, Shield, Calendar, Eye, EyeOff, Wand2 } from 'lucide-react';

// International country data with phone codes and currency
const COUNTRIES = [
  { code: 'IN', name: 'India', phone: '+91', currency: 'INR', taxLabel: 'GSTIN', taxFormat: '22AAAAA0000A1Z5' },
  { code: 'US', name: 'United States', phone: '+1', currency: 'USD', taxLabel: 'EIN', taxFormat: '12-3456789' },
  { code: 'GB', name: 'United Kingdom', phone: '+44', currency: 'GBP', taxLabel: 'VAT', taxFormat: 'GB123456789' },
  { code: 'AE', name: 'UAE', phone: '+971', currency: 'AED', taxLabel: 'TRN', taxFormat: '100234567890003' },
  { code: 'SG', name: 'Singapore', phone: '+65', currency: 'SGD', taxLabel: 'UEN', taxFormat: '200000000A' },
  { code: 'AU', name: 'Australia', phone: '+61', currency: 'AUD', taxLabel: 'ABN', taxFormat: '12 345 678 901' },
  { code: 'DE', name: 'Germany', phone: '+49', currency: 'EUR', taxLabel: 'USt-IdNr', taxFormat: 'DE123456789' },
  { code: 'CA', name: 'Canada', phone: '+1', currency: 'CAD', taxLabel: 'BN', taxFormat: '123456789RC0001' },
  { code: 'JP', name: 'Japan', phone: '+81', currency: 'JPY', taxLabel: 'Corporate Number', taxFormat: '1234567890123' },
  { code: 'FR', name: 'France', phone: '+33', currency: 'EUR', taxLabel: 'SIRET', taxFormat: '12345678901234' },
];

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 
  'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
  'America/Toronto', 'Europe/Berlin', 'Asia/Hong_Kong'
];

// Fallback static plans (used if API fails)
const DEFAULT_SUBSCRIPTION_PLANS = [
  { id: 'starter', code: 'STARTER', name: 'Starter', price: 999, priceMonthly: 999, currency: 'INR', users: 5, maxUsers: 5, modules: 3, storage: '5GB', maxStorageGb: 5, support: 'Email' },
  { id: 'professional', code: 'PROFESSIONAL', name: 'Professional', price: 2999, priceMonthly: 2999, currency: 'INR', users: 25, maxUsers: 25, modules: 10, storage: '50GB', maxStorageGb: 50, support: '24/7 Chat' },
  { id: 'enterprise', code: 'ENTERPRISE', name: 'Enterprise', price: 9999, priceMonthly: 9999, currency: 'INR', users: 'Unlimited', maxUsers: -1, modules: 'All', storage: '500GB', maxStorageGb: 500, support: 'Dedicated Manager' },
  { id: 'custom', code: 'CUSTOM', name: 'Custom', price: 0, priceMonthly: 0, currency: 'INR', users: 'Custom', maxUsers: -1, modules: 'Custom', storage: 'Custom', maxStorageGb: -1, support: 'Custom' },
];

// Dynamic plan type
interface DynamicPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  priceMonthly: number;
  priceYearly?: number;
  currency: string;
  users: number | string;
  maxUsers: number;
  maxBranches?: number;
  modules: number | string;
  storage: string;
  maxStorageGb: number;
  support: string;
  description?: string;
  trialDays?: number;
  isActive?: boolean;
}

const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];

export interface ClientFormValues {
  legal_name: string;
  trade_name: string;
  client_type: string;
  erp_registration_type?: string;
  tax_id: string;
  client_code: string;
  public_code?: string;
  type_sequence_code?: string;
  external_reference?: string;
  registration_number: string;
  business_size: string;
  industry: string;
  sales_representative: string;
  sales_team?: string[];
  currency: string;
  payment_terms: string;
  credit_limit: string;
  billing_cycle: string;
  preferred_payment_method: string;
  bank_details: { account_name: string; bank_name: string; branch: string; account_number: string; swift: string; ifsc: string; iban: string };
  documents: any[];
  user_access: { username: string; role: string; modules: string[] };
  operational: { service_area: string; category: string; preferred_delivery: string; sla: string };
  compliance: { risk_category: string; aml_status: string; verification_date: string; approved_by: string; blacklist: boolean; kyc_status?: string; risk_score?: number };
  segment?: string;
  tier?: string;
  lifecycle_stage?: string;
  source_channel?: string;
  tags?: string[];
  status: string;
  primary_address: { line1: string; line2: string; city: string; state: string; country: string; pincode: string };
  primary_contact: { name: string; role: string; phone: string; phone_code: string; email: string };
  secondary_contact: { name: string; role: string; phone: string; phone_code: string; email: string };
  kyc_documents?: any[];
  // Settings (stored in backend settings JSON)
  country_code: string;
  timezone: string;
  locale: string;
  date_format: string;
  // Branding & Theme
  logo_url?: string;
  logo_file?: File;
  display_name?: string;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  // Registrations tracking
  registrations: {
    gstin?: string;
    pan?: string;
    tan?: string;
    cin?: string;
    llpin?: string;
    udyam?: string;
    iec?: string;
    fssai?: string;
    drug_license?: string;
    shop_license?: string;
    trade_license?: string;
    professional_tax?: string;
    pf_number?: string;
    esi_number?: string;
    other_registrations?: Array<{ name: string; number: string; expiry?: string }>;
  };
  // Subscription fields
  subscription_plan: string;
  subscription_start?: string;
  subscription_end?: string;
  trial_days?: number;
  max_users: number;
  enabled_modules: string[];
  storage_limit_gb: number;
  // Admin user
  admin_users: Array<{ email: string; name: string; role: string; password?: string; confirmPassword?: string }>;
}

export interface ClientFormProps {
  initial?: Partial<ClientFormValues>;
  mode: 'create' | 'edit';
  clientId?: string;
  onSuccess?: (data: any) => void;
}

const defaultValues: ClientFormValues = {
  legal_name: '',
  trade_name: '',
  client_type: 'Not Registered',
  erp_registration_type: 'registered',
  tax_id: '',
  client_code: '',
  public_code: '',
  type_sequence_code: '',
  external_reference: '',
  registration_number: '',
  business_size: '',
  industry: '',
  sales_representative: '',
  sales_team: [],
  currency: 'INR',
  payment_terms: 'Net 30',
  credit_limit: '',
  billing_cycle: 'Monthly',
  preferred_payment_method: '',
  bank_details: { account_name: '', bank_name: '', branch: '', account_number: '', swift: '', ifsc: '', iban: '' },
  documents: [],
  user_access: { username: '', role: 'Client', modules: [] },
  operational: { service_area: '', category: '', preferred_delivery: '', sla: '' },
  compliance: { risk_category: 'Low', aml_status: 'Pending', verification_date: '', approved_by: '', blacklist: false, kyc_status: 'UNVERIFIED', risk_score: 0 },
  segment: 'SMB',
  tier: 'Bronze',
  lifecycle_stage: 'trial',
  source_channel: '',
  tags: [],
  status: 'Active',
  primary_address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
  primary_contact: { name: '', role: '', phone: '', phone_code: '+91', email: '' },
  secondary_contact: { name: '', role: '', phone: '', phone_code: '+91', email: '' },
  kyc_documents: [],
  // Settings (defaults)
  country_code: 'IN',
  timezone: 'Asia/Kolkata',
  locale: 'en-IN',
  date_format: 'DD/MM/YYYY',
  // Branding
  logo_url: '',
  display_name: '',
  theme_primary_color: '#6366f1',
  theme_secondary_color: '#8b5cf6',
  // Registrations
  registrations: {
    gstin: '',
    pan: '',
    tan: '',
    cin: '',
    llpin: '',
    udyam: '',
    iec: '',
    fssai: '',
    drug_license: '',
    shop_license: '',
    trade_license: '',
    professional_tax: '',
    pf_number: '',
    esi_number: '',
    other_registrations: [],
  },
  // Subscription
  subscription_plan: 'starter',
  subscription_start: new Date().toISOString().split('T')[0],
  subscription_end: '',
  trial_days: 14,
  max_users: 5,
  enabled_modules: [],
  storage_limit_gb: 5,
  admin_users: [{ email: '', name: '', role: 'Admin', password: '' }],
};

export default function ClientForm({ initial, mode, clientId, onSuccess }: ClientFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<ClientFormValues>({ ...defaultValues, ...(initial || {}) });
  const [creatingAdmin, setCreatingAdmin] = useState<boolean>(mode === 'create');
  const [adminUser, setAdminUser] = useState<{ email: string; username?: string; password?: string }>({ email: '' });
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<'quick' | 'permanent'>(mode === 'create' ? 'quick' : 'permanent');
  const [activeTab, setActiveTab] = useState<'basic' | 'subscription' | 'uploads' | 'users'>('basic');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; type: string; size: number; category: string; file?: File }>>([]);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Quick Trial form state - matches signup page fields
  const [quickForm, setQuickForm] = useState({
    orgName: '',
    businessType: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [showQuickConfirmPassword, setShowQuickConfirmPassword] = useState(false);
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
  
  // Dynamic subscription plans state - start with empty, not defaults
  const [subscriptionPlans, setSubscriptionPlans] = useState<DynamicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Fetch subscription plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        setPlansError(null);
        // Try the super-admin API first, then fallback to public API
        const response = await fetch(`${API_BASE}/api/super-admin/subscriptions/plans`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.plans) {
            if (data.plans.length === 0) {
              // No plans configured in database
              setSubscriptionPlans([]);
              setPlansError('No subscription plans configured. Please create plans in Subscriptions settings first.');
            } else {
              // Map API plans (snake_case) to component format (camelCase)
              const mappedPlans: DynamicPlan[] = data.plans
                .filter((plan: any) => plan.is_active !== false)
                .map((plan: any) => ({
                  id: (plan.plan_code || plan.code || plan.id)?.toString().toLowerCase(),
                  code: plan.plan_code || plan.code || '',
                  name: plan.name || '',
                  price: parseFloat(plan.price_monthly) || 0,
                  priceMonthly: parseFloat(plan.price_monthly) || 0,
                  priceYearly: parseFloat(plan.price_yearly) || 0,
                  currency: plan.currency || 'INR',
                  users: plan.max_users === -1 ? 'Unlimited' : (plan.max_users || 5),
                  maxUsers: plan.max_users || 5,
                  maxBranches: plan.max_branches || 1,
                  modules: plan.max_users === -1 ? 'All' : Math.min((plan.max_branches || 1) * 3, 20),
                  storage: plan.max_storage_gb === -1 ? 'Unlimited' : `${plan.max_storage_gb || 5}GB`,
                  maxStorageGb: plan.max_storage_gb || 5,
                  support: getSupporType(plan.max_users),
                  description: plan.description || plan.short_description || '',
                  trialDays: plan.trial_days || 14,
                  isActive: plan.is_active !== false,
                }));
              
              // Add custom plan option
              mappedPlans.push({
                id: 'custom',
                code: 'CUSTOM',
                name: 'Custom',
                price: 0,
                priceMonthly: 0,
                currency: 'INR',
                users: 'Custom',
                maxUsers: -1,
                modules: 'Custom',
                storage: 'Custom',
                maxStorageGb: -1,
                support: 'Custom',
              });
              
              setSubscriptionPlans(mappedPlans);
            }
          } else {
            setPlansError('Failed to load subscription plans');
            setSubscriptionPlans([]);
          }
        } else {
          setPlansError('Unable to fetch subscription plans');
          setSubscriptionPlans([]);
        }
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        // Keep using default plans on error
      } finally {
        setPlansLoading(false);
      }
    };
    
    // Helper function to determine support type
    const getSupporType = (maxUsers: number | undefined): string => {
      if (!maxUsers || maxUsers === -1 || maxUsers >= 100) return 'Dedicated Manager';
      if (maxUsers >= 25) return '24/7 Chat';
      return 'Email';
    };

    fetchPlans();
  }, []);

  // Generate a secure random password
  const generatePassword = () => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;
    
    // Ensure at least one of each type
    let password = 
      uppercase[Math.floor(Math.random() * uppercase.length)] +
      lowercase[Math.floor(Math.random() * lowercase.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining with random chars
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = (idx: number) => {
    const newPassword = generatePassword();
    const updated = [...form.admin_users];
    updated[idx].password = newPassword;
    updated[idx].confirmPassword = newPassword;
    setForm({ ...form, admin_users: updated });
    // Show password when auto-generated
    setShowPasswords(prev => ({ ...prev, [idx]: true }));
  };

  // Get country info
  const selectedCountry = COUNTRIES.find(c => c.code === form.country_code) || COUNTRIES[0];
  const selectedPlan = subscriptionPlans.find(p => p.id === form.subscription_plan) || subscriptionPlans[0];

  // Handle country change - auto-update currency, phone code, tax label
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setForm({
        ...form,
        country_code: countryCode,
        currency: country.currency,
        primary_contact: { ...form.primary_contact, phone_code: country.phone },
        secondary_contact: { ...form.secondary_contact, phone_code: country.phone },
        primary_address: { ...form.primary_address, country: country.name },
      });
    }
  };

  // Handle plan change - auto-update limits
  const handlePlanChange = (planId: string) => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (plan) {
      setForm({
        ...form,
        subscription_plan: planId,
        max_users: typeof plan.users === 'number' ? plan.users : 999,
        storage_limit_gb: parseInt(plan.storage) || 500,
      });
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      const newDocs = Array.from(e.dataTransfer.files).map(f => ({
        name: f.name, type: f.type, size: f.size, category: 'GENERAL', file: f
      }));
      setUploadedDocs([...uploadedDocs, ...newDocs]);
    }
  }, [uploadedDocs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newDocs = Array.from(e.target.files).map(f => ({
        name: f.name, type: f.type, size: f.size, category: 'GENERAL', file: f
      }));
      setUploadedDocs([...uploadedDocs, ...newDocs]);
    }
  };

  const removeDoc = (idx: number) => {
    setUploadedDocs(uploadedDocs.filter((_, i) => i !== idx));
  };

  const updateDocCategory = (idx: number, category: string) => {
    const updated = [...uploadedDocs];
    updated[idx].category = category;
    setUploadedDocs(updated);
  };

  // Add admin user
  const addAdminUser = () => {
    setForm({
      ...form,
      admin_users: [...form.admin_users, { email: '', name: '', role: 'User', password: '' }]
    });
  };

  const removeAdminUser = (idx: number) => {
    setForm({
      ...form,
      admin_users: form.admin_users.filter((_, i) => i !== idx)
    });
  };

  const updateAdminUser = (idx: number, field: string, value: string) => {
    const updated = [...form.admin_users];
    (updated[idx] as any)[field] = value;
    setForm({ ...form, admin_users: updated });
  };

  // Add a ref to track if submission is in progress (prevents double-clicks)
  const isSubmittingRef = React.useRef(false);

  // Quick Trial submission - uses same /api/onboard as signup page
  async function submitQuickTrial() {
    if (isSubmittingRef.current || loading) {
      console.log('[ClientForm] Quick trial submission already in progress');
      return;
    }
    
    // Validate Quick Trial form
    const errors: Record<string, string> = {};
    if (!quickForm.orgName || quickForm.orgName.length < 2) {
      errors.orgName = 'Organization name must be at least 2 characters';
    }
    if (!quickForm.businessType) {
      errors.businessType = 'Please select a business type';
    }
    if (!quickForm.fullName || quickForm.fullName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }
    if (!quickForm.email || !quickForm.email.includes('@')) {
      errors.email = 'Please enter a valid email address';
    }
    if (!quickForm.password || quickForm.password.length < 12) {
      errors.password = 'Password must be at least 12 characters';
    } else {
      if (!/[A-Z]/.test(quickForm.password)) errors.password = 'Password must contain at least one uppercase letter';
      else if (!/[a-z]/.test(quickForm.password)) errors.password = 'Password must contain at least one lowercase letter';
      else if (!/[0-9]/.test(quickForm.password)) errors.password = 'Password must contain at least one number';
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(quickForm.password)) errors.password = 'Password must contain at least one special character';
    }
    if (quickForm.password !== quickForm.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }
    
    if (Object.keys(errors).length > 0) {
      setQuickErrors(errors);
      return;
    }
    setQuickErrors({});
    
    isSubmittingRef.current = true;
    setLoading(true);
    
    try {
      const baseURL = API_BASE || '';
      const response = await fetch(`${baseURL}/api/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName: quickForm.orgName,
          adminEmail: quickForm.email,
          adminName: quickForm.fullName,
          adminPassword: quickForm.password,
          plan: 'trial',
          phone: quickForm.phone || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          industry: quickForm.businessType,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const successMsg = `Trial started successfully!

Organization: ${quickForm.orgName}
Admin Email: ${quickForm.email}
Password: (as you entered)

Your 14-day trial has started. The admin can login immediately.`;
        
        alert(successMsg);
        if (onSuccess) onSuccess(data);
      } else {
        alert(data.error || 'Failed to create organization. Please try again.');
      }
    } catch (err) {
      console.error('Quick Trial error:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }

  async function submit() {
    // Prevent duplicate submissions
    if (isSubmittingRef.current || loading) {
      console.log('[ClientForm] Submission already in progress, ignoring');
      return;
    }
    
    if (!form.legal_name && !form.trade_name) {
      alert('Legal or Trade Name required');
      return;
    }
    // Quick mode: minimal requirements
    if (mode === 'create' && registrationMode === 'quick') {
      if (!form.admin_users[0]?.email) {
        alert('Admin email required to start a trial');
        return;
      }
    } else if (mode === 'create') {
      // Permanent: require full primary contact
      if (!form.primary_contact.name || !form.primary_contact.email || !form.primary_contact.phone) {
        alert('Primary contact details required');
        return;
      }
    }
    
    // Validate passwords match for all admin users (in create mode)
    if (mode === 'create') {
      for (let i = 0; i < form.admin_users.length; i++) {
        const adminU = form.admin_users[i];
        if (adminU.email) {
          if (!adminU.password || adminU.password.length < 8) {
            alert(`Password for ${adminU.email || `admin user ${i + 1}`} must be at least 8 characters`);
            return;
          }
          if (adminU.password !== adminU.confirmPassword) {
            alert(`Passwords do not match for ${adminU.email || `admin user ${i + 1}`}`);
            return;
          }
        }
      }
    }
    
    // Set submission guard
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const body: any = { ...form, name: form.legal_name || form.trade_name };
      
      // Generate unique client code if not provided (timestamp + random)
      if (!body.client_code) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        body.client_code = `CLI-${timestamp}-${random}`;
      }
      
      // Include international settings
      body.settings = {
        country_code: form.country_code,
        timezone: form.timezone,
        locale: form.locale,
        date_format: form.date_format,
        currency: form.currency,
      };
      // Include subscription details
      body.subscription = {
        plan: form.subscription_plan,
        start_date: form.subscription_start,
        end_date: form.subscription_end,
        trial_days: form.trial_days,
        max_users: form.max_users,
        storage_limit_gb: form.storage_limit_gb,
        enabled_modules: form.enabled_modules,
      };
      // Include admin users to create
      body.admin_users = form.admin_users.filter(u => u.email);
      // Include uploaded documents metadata
      body.uploaded_documents = uploadedDocs.map(d => ({
        filename: d.name,
        content_type: d.type,
        size_bytes: d.size,
        category: d.category,
      }));
      // Flatten some meta that backend will store inside enterprise meta
      body.meta = {
        public_code: form.public_code || undefined,
        type_sequence_code: form.type_sequence_code || undefined,
        external_reference: form.external_reference || undefined,
        erp_registration_type: (mode === 'create' && registrationMode === 'quick') ? 'trial' : (form.erp_registration_type || undefined),
        segment: form.segment,
        tier: form.tier,
        lifecycle_stage: form.lifecycle_stage,
        source_channel: form.source_channel,
        tags: form.tags,
        sales_team: form.sales_team,
        kyc_status: form.compliance.kyc_status,
        risk_score: form.compliance.risk_score,
        kyc_documents: form.kyc_documents,
      };
      const sid = (user as any)?.super_admin_id ?? (user as any)?.superAdminId ?? (((user as any)?.role === 'SUPER_ADMIN' || (user as any)?.roleName === 'SUPER_ADMIN') ? (user as any)?.id : undefined);
      if (sid) body.super_admin_id = sid;
      // Quick mode always provisions an admin; Permanent follows the toggle
      const shouldProvision = (mode === 'create' && registrationMode === 'quick') ? true : creatingAdmin;
      if (shouldProvision && form.admin_users[0]?.email) {
        body.adminUser = form.admin_users[0];
        body.ensurePermissions = true;
        body.defaultViewAll = true;
      }
      let url = `${API_BASE}/api/system/clients`;
      let method = 'POST';
      if (mode === 'edit' && clientId) {
        url = `${API_BASE}/api/system/clients/${encodeURIComponent(clientId)}`;
        method = 'PATCH';
      }
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      
      // Show success message with login credentials if admin was created
      if (mode === 'create' && json.admin) {
        const adminEmail = json.admin.email;
        const adminUsername = json.admin.username;
        const password = json.tempPassword || form.admin_users[0]?.password;
        
        let successMsg = registrationMode === 'quick' ? 'Trial started successfully!' : 'Client created successfully!';
        successMsg += `\n\nAdmin Login Credentials:`;
        successMsg += `\nEmail: ${adminEmail}`;
        if (adminUsername && adminUsername !== adminEmail.split('@')[0]) {
          successMsg += `\nUsername: ${adminUsername}`;
        }
        if (json.tempPassword) {
          successMsg += `\nTemporary Password: ${json.tempPassword}`;
          successMsg += `\n\n⚠️ Please save this password - it won't be shown again!`;
        } else if (password) {
          successMsg += `\nPassword: (as entered in the form)`;
        }
        successMsg += `\n\nThe user can login immediately.`;
        
        alert(successMsg);
      } else {
        alert(mode === 'create' ? (registrationMode === 'quick' ? 'Trial started' : 'Client created') : 'Client updated');
      }
      
      if (onSuccess) onSuccess(json);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }

  // Tab navigation component
  const TabNav = () => (
    <div className="flex border-b mb-6 overflow-x-auto">
      {[
        { id: 'basic', label: 'Basic Info', icon: Building2 },
        { id: 'subscription', label: 'Subscription', icon: CreditCard },
        { id: 'uploads', label: 'Uploads', icon: FileText },
        { id: 'users', label: 'Users', icon: Users },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === tab.id 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
      {/* Registration Mode Toggle (Create only) */}
      {mode === 'create' && (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Registration Type:</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button type="button" onClick={() => setRegistrationMode('quick')} className={`px-4 py-2 text-sm font-medium ${registrationMode==='quick' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Quick Trial</button>
              <button type="button" onClick={() => setRegistrationMode('permanent')} className={`px-4 py-2 text-sm font-medium ${registrationMode==='permanent' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Full Registration</button>
            </div>
          </div>
          {registrationMode==='quick' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Quick creates a trial tenant with minimal details.</p>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      {registrationMode === 'permanent' && <TabNav />}

      {/* QUICK TRIAL FORM - Matches Signup Page */}
      {mode === 'create' && registrationMode === 'quick' && (
        <div className="space-y-6">
          {/* Organization Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Organization Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Name *</label>
                <input 
                  value={quickForm.orgName} 
                  onChange={(e) => { setQuickForm({ ...quickForm, orgName: e.target.value }); if (quickErrors.orgName) setQuickErrors({ ...quickErrors, orgName: '' }); }} 
                  className={`w-full border rounded-lg p-2.5 bg-white dark:bg-gray-800 ${quickErrors.orgName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter organization name" 
                />
                {quickErrors.orgName && <p className="mt-1 text-xs text-red-600">{quickErrors.orgName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type *</label>
                <select 
                  value={quickForm.businessType} 
                  onChange={(e) => { setQuickForm({ ...quickForm, businessType: e.target.value }); if (quickErrors.businessType) setQuickErrors({ ...quickErrors, businessType: '' }); }}
                  className={`w-full border rounded-lg p-2.5 bg-white dark:bg-gray-800 ${quickErrors.businessType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">Select type</option>
                  <option>Sole Proprietorship</option>
                  <option>Partnership</option>
                  <option>Private Limited</option>
                  <option>Public Limited</option>
                  <option>LLP</option>
                  <option>Non-Profit</option>
                  <option>Other</option>
                </select>
                {quickErrors.businessType && <p className="mt-1 text-xs text-red-600">{quickErrors.businessType}</p>}
              </div>
            </div>
          </div>

          {/* Admin Account */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4" /> Admin Account
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This will be the primary admin for the organization.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input 
                  value={quickForm.fullName} 
                  onChange={(e) => { setQuickForm({ ...quickForm, fullName: e.target.value }); if (quickErrors.fullName) setQuickErrors({ ...quickErrors, fullName: '' }); }}
                  className={`w-full border rounded-lg p-2.5 bg-white dark:bg-gray-800 ${quickErrors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Your full name" 
                />
                {quickErrors.fullName && <p className="mt-1 text-xs text-red-600">{quickErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input 
                  type="email"
                  value={quickForm.email} 
                  onChange={(e) => { setQuickForm({ ...quickForm, email: e.target.value }); if (quickErrors.email) setQuickErrors({ ...quickErrors, email: '' }); }}
                  className={`w-full border rounded-lg p-2.5 bg-white dark:bg-gray-800 ${quickErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="admin@company.com" 
                />
                {quickErrors.email && <p className="mt-1 text-xs text-red-600">{quickErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
                <input 
                  type="tel"
                  value={quickForm.phone} 
                  onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800"
                  placeholder="+91 98765 43210" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <div className="relative">
                  <input 
                    type={showQuickPassword ? 'text' : 'password'}
                    value={quickForm.password} 
                    onChange={(e) => { setQuickForm({ ...quickForm, password: e.target.value }); if (quickErrors.password) setQuickErrors({ ...quickErrors, password: '' }); }}
                    className={`w-full border rounded-lg p-2.5 pr-10 bg-white dark:bg-gray-800 ${quickErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Min 12 chars, Aa1@..." 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowQuickPassword(!showQuickPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showQuickPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {quickErrors.password && <p className="mt-1 text-xs text-red-600">{quickErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
                <div className="relative">
                  <input 
                    type={showQuickConfirmPassword ? 'text' : 'password'}
                    value={quickForm.confirmPassword} 
                    onChange={(e) => { setQuickForm({ ...quickForm, confirmPassword: e.target.value }); if (quickErrors.confirmPassword) setQuickErrors({ ...quickErrors, confirmPassword: '' }); }}
                    className={`w-full border rounded-lg p-2.5 pr-10 bg-white dark:bg-gray-800 ${quickErrors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Re-enter password" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowQuickConfirmPassword(!showQuickConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showQuickConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {quickErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{quickErrors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          {/* Trial Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Free Trial</strong> — Full access to all features. No credit card required.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={submitQuickTrial}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Start Trial
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB: Basic Info (Full Registration only) */}
      {registrationMode === 'permanent' && activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legal Name *</label>
              <input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" placeholder="Company Legal Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trade Name / Brand</label>
              <input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" placeholder="Display Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
              <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                <option>Private Limited</option>
                <option>Public Limited</option>
                <option>LLP</option>
                <option>Partnership</option>
                <option>Proprietorship</option>
                <option>LLC</option>
                <option>Corporation</option>
                <option>Non-Profit</option>
                <option>Government</option>
                <option>Not Registered</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{selectedCountry.taxLabel} (Tax ID)</label>
              <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" placeholder={selectedCountry.taxFormat} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                <option value="">Select Industry</option>
                <option>Technology</option>
                <option>Healthcare</option>
                <option>Finance</option>
                <option>Manufacturing</option>
                <option>Retail</option>
                <option>Education</option>
                <option>Real Estate</option>
                <option>Transportation</option>
                <option>Energy</option>
                <option>Agriculture</option>
                <option>Hospitality</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Size</label>
              <select value={form.business_size} onChange={(e) => setForm({ ...form, business_size: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                <option value="">Select Size</option>
                <option>1-10 employees</option>
                <option>11-50 employees</option>
                <option>51-200 employees</option>
                <option>201-500 employees</option>
                <option>501-1000 employees</option>
                <option>1000+ employees</option>
              </select>
            </div>
          </div>

          {/* Primary Address */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Primary Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Address Line 1" value={form.primary_address.line1} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, line1: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              <input placeholder="Address Line 2" value={form.primary_address.line2} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, line2: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              <input placeholder="City" value={form.primary_address.city} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, city: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              <input placeholder="State / Province" value={form.primary_address.state} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, state: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              <input placeholder="Country" value={form.primary_address.country} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, country: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              <input placeholder="ZIP / Postal Code" value={form.primary_address.pincode} onChange={(e) => setForm({ ...form, primary_address: { ...form.primary_address, pincode: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
            </div>
          </div>

          {/* Primary Contact */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Primary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Contact Name *" value={form.primary_contact.name} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, name: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              <input placeholder="Designation / Role" value={form.primary_contact.role} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, role: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              <div className="flex gap-2">
                <select value={form.primary_contact.phone_code} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, phone_code: e.target.value } })} className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  {COUNTRIES.map(c => <option key={c.code} value={c.phone}>{c.phone}</option>)}
                </select>
                <input placeholder="Phone Number *" value={form.primary_contact.phone} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, phone: e.target.value } })} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <input placeholder="Email Address *" type="email" value={form.primary_contact.email} onChange={(e) => setForm({ ...form, primary_contact: { ...form.primary_contact, email: e.target.value } })} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
            </div>
          </div>
        </div>
      )}

      {/* TAB: Subscription */}
      {registrationMode === 'permanent' && activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Plan Selection */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4" /> Select Subscription Plan
              {plansLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
            </h3>
            
            {/* Error or Empty State */}
            {plansError && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <p className="text-amber-800 dark:text-amber-200 font-medium">⚠️ {plansError}</p>
                <a 
                  href="/super-admin/subscriptions" 
                  className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                >
                  → Go to Subscriptions to create plans
                </a>
              </div>
            )}
            
            {/* Plans Grid */}
            {subscriptionPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {subscriptionPlans.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => handlePlanChange(plan.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      form.subscription_plan === plan.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-semibold text-lg">{plan.name}</h4>
                    {plan.price > 0 ? (
                      <p className="text-2xl font-bold text-blue-600">₹{plan.price.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                    ) : (
                      <p className="text-2xl font-bold text-blue-600">Contact Us</p>
                    )}
                    <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>👥 {plan.users} users</li>
                      <li>📦 {plan.modules} modules</li>
                      <li>💾 {plan.storage} storage</li>
                      <li>🎧 {plan.support}</li>
                    </ul>
                    {plan.description && (
                      <p className="mt-2 text-xs text-gray-500">{plan.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : !plansLoading && !plansError ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No subscription plans available</p>
              </div>
            ) : null}
          </div>

          {/* Billing Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Billing Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Cycle</label>
                <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input type="date" value={form.subscription_start} onChange={(e) => setForm({ ...form, subscription_start: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Days</label>
                <input type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Users</label>
                <input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: parseInt(e.target.value) || 1 })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Storage Limit (GB)</label>
                <input type="number" value={form.storage_limit_gb} onChange={(e) => setForm({ ...form, storage_limit_gb: parseInt(e.target.value) || 1 })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                <select value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                  <option>Due on Receipt</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Uploads - Logo, Branding, Registrations, Documents */}
      {registrationMode === 'permanent' && activeTab === 'uploads' && (
        <div className="space-y-6">
          
          {/* Logo & Branding Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
              🎨 Logo & Branding
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload company logo (SVG only) for splash screen. If not uploaded, Display Name or default BISMAN logo will be used.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Logo (.SVG only)</label>
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    ) : form.display_name ? (
                      <span className="text-2xl font-bold text-gray-400">{form.display_name.substring(0, 2).toUpperCase()}</span>
                    ) : (
                      <span className="text-xs text-gray-400 text-center px-2">BISMAN Logo</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept=".svg,image/svg+xml" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.name.endsWith('.svg')) {
                            alert('Please upload only SVG files');
                            return;
                          }
                          setLogoFile(file);
                          const reader = new FileReader();
                          reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} 
                      className="hidden" 
                      id="logo-upload" 
                    />
                    <label htmlFor="logo-upload" className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                      <Upload className="w-4 h-4 mr-2" /> Upload SVG Logo
                    </label>
                    {logoPreview && (
                      <button 
                        onClick={() => { setLogoPreview(null); setLogoFile(null); }} 
                        className="ml-2 text-sm text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-500 mt-2">Recommended: 200x200px transparent SVG</p>
                  </div>
                </div>
              </div>
              
              {/* Display Name & Theme Colors */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name (for Splash Screen)</label>
                  <input 
                    type="text" 
                    value={form.display_name || ''} 
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })} 
                    placeholder="e.g., ABC Corp" 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Theme Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={form.theme_primary_color || '#6366f1'} 
                        onChange={(e) => setForm({ ...form, theme_primary_color: e.target.value })} 
                        className="w-10 h-10 rounded cursor-pointer border-0" 
                      />
                      <input 
                        type="text" 
                        value={form.theme_primary_color || '#6366f1'} 
                        onChange={(e) => setForm({ ...form, theme_primary_color: e.target.value })} 
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 text-sm font-mono" 
                        placeholder="#6366f1" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Theme Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={form.theme_secondary_color || '#8b5cf6'} 
                        onChange={(e) => setForm({ ...form, theme_secondary_color: e.target.value })} 
                        className="w-10 h-10 rounded cursor-pointer border-0" 
                      />
                      <input 
                        type="text" 
                        value={form.theme_secondary_color || '#8b5cf6'} 
                        onChange={(e) => setForm({ ...form, theme_secondary_color: e.target.value })} 
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 text-sm font-mono" 
                        placeholder="#8b5cf6" 
                      />
                    </div>
                  </div>
                </div>
                {/* Theme Preview */}
                <div className="p-3 rounded-lg" style={{ background: `linear-gradient(135deg, ${form.theme_primary_color || '#6366f1'}, ${form.theme_secondary_color || '#8b5cf6'})` }}>
                  <p className="text-white text-sm font-medium text-center">Theme Preview</p>
                </div>
              </div>
            </div>
          </div>

          {/* Registrations Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
              📋 Business Registrations
            </h3>
            <p className="text-sm text-gray-500 mb-4">Track all business registration numbers for compliance and documentation.</p>
            
            {/* Primary Registrations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GSTIN</label>
                <input 
                  type="text" 
                  value={form.registrations?.gstin || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, gstin: e.target.value.toUpperCase() } })} 
                  placeholder="22AAAAA0000A1Z5" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN</label>
                <input 
                  type="text" 
                  value={form.registrations?.pan || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, pan: e.target.value.toUpperCase() } })} 
                  placeholder="AAAAA0000A" 
                  maxLength={10}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TAN</label>
                <input 
                  type="text" 
                  value={form.registrations?.tan || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, tan: e.target.value.toUpperCase() } })} 
                  placeholder="AAAA00000A" 
                  maxLength={10}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
            </div>

            {/* Company Registrations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CIN (Company)</label>
                <input 
                  type="text" 
                  value={form.registrations?.cin || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, cin: e.target.value.toUpperCase() } })} 
                  placeholder="U00000XX0000XXX000000" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LLPIN (LLP)</label>
                <input 
                  type="text" 
                  value={form.registrations?.llpin || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, llpin: e.target.value.toUpperCase() } })} 
                  placeholder="AAA-0000" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Udyam (MSME)</label>
                <input 
                  type="text" 
                  value={form.registrations?.udyam || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, udyam: e.target.value.toUpperCase() } })} 
                  placeholder="UDYAM-XX-00-0000000" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
            </div>

            {/* License Registrations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IEC (Import/Export)</label>
                <input 
                  type="text" 
                  value={form.registrations?.iec || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, iec: e.target.value.toUpperCase() } })} 
                  placeholder="AAAAAAA000" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">FSSAI License</label>
                <input 
                  type="text" 
                  value={form.registrations?.fssai || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, fssai: e.target.value } })} 
                  placeholder="00000000000000" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drug License</label>
                <input 
                  type="text" 
                  value={form.registrations?.drug_license || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, drug_license: e.target.value } })} 
                  placeholder="License Number" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
            </div>

            {/* Local Licenses */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop & Establishment</label>
                <input 
                  type="text" 
                  value={form.registrations?.shop_license || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, shop_license: e.target.value } })} 
                  placeholder="License Number" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trade License</label>
                <input 
                  type="text" 
                  value={form.registrations?.trade_license || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, trade_license: e.target.value } })} 
                  placeholder="License Number" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Professional Tax</label>
                <input 
                  type="text" 
                  value={form.registrations?.professional_tax || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, professional_tax: e.target.value } })} 
                  placeholder="PT Number" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
            </div>

            {/* Employee Registrations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PF Number (EPFO)</label>
                <input 
                  type="text" 
                  value={form.registrations?.pf_number || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, pf_number: e.target.value.toUpperCase() } })} 
                  placeholder="AAAA/AAA/0000000/000/0000000" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ESI Number</label>
                <input 
                  type="text" 
                  value={form.registrations?.esi_number || ''} 
                  onChange={(e) => setForm({ ...form, registrations: { ...form.registrations, esi_number: e.target.value } })} 
                  placeholder="00-00-000000-000-0000" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-800 font-mono text-sm" 
                />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4" /> Upload Documents
            </h3>
            
            {/* Drag & Drop Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">Drag & drop files here, or click to browse</p>
              <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" /> Select Files
              </label>
              <p className="text-xs text-gray-500 mt-2">Supported: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)</p>
            </div>

            {/* Document Categories */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Categories:</p>
              <div className="flex flex-wrap gap-2">
                {['GST Certificate', 'PAN Card', 'Incorporation Cert', 'Bank Statement', 'Address Proof', 'Contract', 'License', 'Other'].map(cat => (
                  <span key={cat} className="px-2 py-1 bg-white dark:bg-gray-700 border rounded text-xs">{cat}</span>
                ))}
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedDocs.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">Uploaded Files ({uploadedDocs.length})</h4>
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={doc.category} onChange={(e) => updateDocCategory(idx, e.target.value)} className="text-sm border rounded p-1">
                        <option value="GENERAL">General</option>
                        <option value="GST_CERT">GST Certificate</option>
                        <option value="PAN_CARD">PAN Card</option>
                        <option value="INCORPORATION">Incorporation Cert</option>
                        <option value="TAX">Tax Document</option>
                        <option value="BANK">Bank Details</option>
                        <option value="ADDRESS_PROOF">Address Proof</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="LICENSE">License</option>
                      </select>
                      <button onClick={() => removeDoc(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Users (Full Registration only) */}
      {registrationMode === 'permanent' && activeTab === 'users' && (
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Users className="w-4 h-4" /> Admin Users
              </h3>
              <button onClick={addAdminUser} className="text-sm text-blue-600 hover:underline">+ Add User</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Add admin users who will manage this client account.
            </p>
            
            {form.admin_users.map((adminU, idx) => (
              <div key={idx} className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                    <input 
                      type="email" 
                      placeholder="admin@company.com" 
                      value={adminU.email} 
                      onChange={(e) => updateAdminUser(idx, 'email', e.target.value)} 
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input 
                      placeholder="Full Name" 
                      value={adminU.name} 
                      onChange={(e) => updateAdminUser(idx, 'name', e.target.value)} 
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <select 
                      value={adminU.role} 
                      onChange={(e) => updateAdminUser(idx, 'role', e.target.value)} 
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700"
                    >
                      <option>Admin</option>
                      <option>Manager</option>
                      <option>User</option>
                    </select>
                  </div>
                  {idx > 0 && registrationMode === 'permanent' && (
                    <div className="flex items-end">
                      <button onClick={() => removeAdminUser(idx)} className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50">Remove</button>
                    </div>
                  )}
                </div>
                
                {/* Password Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password {mode === 'create' ? '*' : ''}
                    </label>
                    <div className="relative">
                      <input 
                        type={showPasswords[idx] ? 'text' : 'password'}
                        placeholder={mode === 'edit' ? '(leave blank to keep)' : 'Min 8 characters'}
                        value={adminU.password || ''} 
                        onChange={(e) => updateAdminUser(idx, 'password', e.target.value)} 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pr-10 bg-white dark:bg-gray-700" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password {mode === 'create' ? '*' : ''}
                    </label>
                    <div className="relative">
                      <input 
                        type={showPasswords[idx] ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={adminU.confirmPassword || ''} 
                        onChange={(e) => updateAdminUser(idx, 'confirmPassword', e.target.value)} 
                        className={`w-full border rounded-lg p-2.5 pr-10 bg-white dark:bg-gray-700 ${
                          adminU.password && adminU.confirmPassword && adminU.password !== adminU.confirmPassword 
                            ? 'border-red-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {adminU.password && adminU.confirmPassword && adminU.password !== adminU.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="button"
                      onClick={() => handleGeneratePassword(idx)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Wand2 className="w-4 h-4" />
                      Generate Password
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button (Full Registration only - Quick Trial has its own) */}
      {(registrationMode === 'permanent' || mode === 'edit') && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={submit} disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium flex items-center hover:bg-blue-700 disabled:opacity-50">
            {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />} 
            {mode === 'create' ? 'Create Client' : 'Update Client'}
          </button>
        </div>
      )}
    </div>
  );
}
