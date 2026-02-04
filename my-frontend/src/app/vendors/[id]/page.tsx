'use client';

/**
 * ============================================================================
 * BISMAN ERP - Vendor Detail View Page
 * ============================================================================
 * 
 * Comprehensive vendor detail page showing:
 * - Legal information
 * - Contact & addresses
 * - Documents with verification status
 * - Banking details
 * - Risk assessment
 * - Approval history
 * - Audit trail
 * 
 * @module pages/vendors/[id]
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Building2, ArrowLeft, Edit, Download, MoreVertical,
  FileText, Users, MapPin, Upload, CreditCard, Shield, Clock,
  AlertTriangle, CheckCircle, XCircle, Pause, Eye, Trash2,
  Phone, Mail, Globe, Calendar, Hash, Star, ChevronDown, ChevronUp,
  RefreshCw, Send, History, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/common/hooks/useAuth';
import api from '@/lib/api/axios';

// ============================================================================
// TYPES
// ============================================================================

interface VendorDetail {
  id: string;
  vendor_code: string;
  legal_name: string;
  trade_name?: string;
  business_type_id?: number;
  business_type_name?: string;
  registration_number?: string;
  gst_number?: string;
  pan_number?: string;
  cin_number?: string;
  tin_number?: string;
  incorporation_date?: string;
  country: string;
  state?: string;
  
  industry_id?: number;
  industry_name?: string;
  services_products?: string[];
  annual_turnover?: number;
  company_size?: string;
  website?: string;
  primary_market?: string;
  
  is_msme: boolean;
  msme_number?: string;
  msme_category?: string;
  
  status: string;
  approval_status: string;
  risk_level: string;
  compliance_score: number;
  is_active: boolean;
  is_verified: boolean;
  is_blacklisted: boolean;
  last_audit_date?: string;
  
  default_payment_terms?: string;
  credit_limit?: number;
  credit_days?: number;
  
  tds_applicable: boolean;
  tds_section?: string;
  tds_rate?: number;
  
  notes?: string;
  tags?: string[];
  
  created_at: string;
  created_by_name?: string;
  updated_at: string;
  updated_by_name?: string;
  
  // Related data
  contacts: VendorContact[];
  addresses: VendorAddress[];
  documents: VendorDocument[];
  banks: VendorBank[];
  riskAssessments: RiskAssessment[];
  approvals: ApprovalRecord[];
  recentAudit: AuditLog[];
}

interface VendorContact {
  id: string;
  contact_type: string;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  is_verified: boolean;
}

interface VendorAddress {
  id: string;
  address_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_primary: boolean;
}

interface VendorDocument {
  id: string;
  document_type: string;
  document_name: string;
  document_number?: string;
  file_name: string;
  file_size?: number;
  issue_date?: string;
  expiry_date?: string;
  verification_status: string;
  verified_by_name?: string;
  verified_at?: string;
  is_mandatory: boolean;
  created_at: string;
}

interface VendorBank {
  id: string;
  bank_name: string;
  branch_name?: string;
  account_holder_name: string;
  account_number: string;
  account_type: string;
  ifsc_code: string;
  swift_code?: string;
  upi_id?: string;
  is_primary: boolean;
  is_verified: boolean;
}

interface RiskAssessment {
  id: string;
  assessment_date: string;
  assessment_type: string;
  overall_risk_level?: string;
  internal_rating?: number;
  background_check_status: string;
  blacklist_check_status: string;
  status: string;
  assessed_by_name?: string;
}

interface ApprovalRecord {
  id: string;
  workflow_stage: string;
  request_type: string;
  decision?: string;
  decision_date?: string;
  remarks?: string;
  approver_name?: string;
  requested_by_name?: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  action_category?: string;
  actor_name?: string;
  actor_role?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  pending: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  under_review: { label: 'Under Review', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  approved: { label: 'Approved', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  active: { label: 'Active', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  suspended: { label: 'Suspended', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  blacklisted: { label: 'Blacklisted', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  archived: { label: 'Archived', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700' },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low Risk', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  medium: { label: 'Medium Risk', color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  high: { label: 'High Risk', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const DOC_VERIFICATION_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-yellow-600', icon: Clock },
  verified: { label: 'Verified', color: 'text-green-600', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-600', icon: XCircle },
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  incorporation_certificate: 'Certificate of Incorporation',
  gst_certificate: 'GST Certificate',
  pan_card: 'PAN Card',
  bank_proof: 'Bank Proof',
  nda: 'NDA (Signed)',
  iso_certificate: 'ISO Certificate',
  insurance: 'Insurance Document',
};

// ============================================================================
// COMPONENTS
// ============================================================================

function Section({ 
  title, 
  icon: Icon, 
  children, 
  actions,
  collapsible = false,
  defaultOpen = true 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div 
        className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-500" />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {actions}
          {collapsible && (
            isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>
      {isOpen && <div className="p-6">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-sm font-medium text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-gray-400">-</span>}
      </dd>
    </div>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function ComplianceScoreBar({ score }: { score: number }) {
  let color = 'bg-green-500';
  if (score < 50) color = 'bg-red-500';
  else if (score < 75) color = 'bg-yellow-500';
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-lg font-bold text-gray-900 dark:text-white">{score}%</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params?.id as string;
  const { hasAccess } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history'>('overview');

  // Permissions
  const permissions = {
    VIEW_VENDOR: hasAccess?.('VIEW_VENDOR') ?? false,
    UPDATE_VENDOR: hasAccess?.('UPDATE_VENDOR') ?? false,
    APPROVE_VENDOR: hasAccess?.('APPROVE_VENDOR') ?? false,
    SUSPEND_VENDOR: hasAccess?.('SUSPEND_VENDOR') ?? false,
    UPLOAD_VENDOR_DOC: hasAccess?.('UPLOAD_VENDOR_DOC') ?? false,
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchVendor = useCallback(async () => {
    if (!vendorId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/vendors/${vendorId}`);
      if (response.data.success) {
        setVendor(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleApprove = async () => {
    const remarks = prompt('Add approval remarks (optional):');
    try {
      await api.post(`/api/vendors/${vendorId}/approve`, { remarks });
      fetchVendor();
    } catch (error) {
      console.error('Error approving vendor:', error);
    }
  };

  const handleReject = async () => {
    const remarks = prompt('Enter rejection reason (required):');
    if (!remarks?.trim()) {
      alert('Rejection reason is required');
      return;
    }
    try {
      await api.post(`/api/vendors/${vendorId}/reject`, { remarks });
      fetchVendor();
    } catch (error) {
      console.error('Error rejecting vendor:', error);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Enter suspension reason (required):');
    if (!reason?.trim()) {
      alert('Suspension reason is required');
      return;
    }
    try {
      await api.post(`/api/vendors/${vendorId}/suspend`, { reason });
      fetchVendor();
    } catch (error) {
      console.error('Error suspending vendor:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      await api.post(`/api/vendors/${vendorId}/reactivate`, { remarks: 'Reactivated' });
      fetchVendor();
    } catch (error) {
      console.error('Error reactivating vendor:', error);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Vendor not found</h2>
          <button
            onClick={() => router.push('/vendors')}
            className="text-blue-600 hover:underline"
          >
            Back to vendors
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[vendor.status] || STATUS_CONFIG.draft;
  const riskConfig = RISK_CONFIG[vendor.risk_level] || RISK_CONFIG.medium;
  const primaryContact = vendor.contacts.find(c => c.is_primary);
  const primaryAddress = vendor.addresses.find(a => a.is_primary || a.address_type === 'registered');
  const primaryBank = vendor.banks.find(b => b.is_primary);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/vendors')}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vendor.legal_name}
                </h1>
                {vendor.is_verified && (
                  <Badge color="green">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {vendor.is_msme && (
                  <Badge color="purple">MSME</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-mono">{vendor.vendor_code}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}>
                  {riskConfig.label}
                </span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {permissions.UPDATE_VENDOR && (
              <button
                onClick={() => router.push(`/vendors/${vendorId}/edit`)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            
            {permissions.APPROVE_VENDOR && vendor.approval_status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
            
            {permissions.SUSPEND_VENDOR && vendor.status === 'active' && (
              <button
                onClick={handleSuspend}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Suspend
              </button>
            )}
            
            {permissions.APPROVE_VENDOR && vendor.status === 'suspended' && (
              <button
                onClick={handleReactivate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reactivate
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'documents', label: `Documents (${vendor.documents.length})` },
              { id: 'history', label: 'History & Audit' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Legal Identity */}
              <Section title="Legal Identity" icon={FileText}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <dl>
                    <InfoRow label="Legal Name" value={vendor.legal_name} />
                    <InfoRow label="Trade Name" value={vendor.trade_name} />
                    <InfoRow label="Business Type" value={vendor.business_type_name} />
                    <InfoRow label="Registration No." value={vendor.registration_number} mono />
                    <InfoRow label="Incorporation Date" value={vendor.incorporation_date ? new Date(vendor.incorporation_date).toLocaleDateString() : null} />
                  </dl>
                  <dl>
                    <InfoRow label="GST Number" value={vendor.gst_number} mono />
                    <InfoRow label="PAN Number" value={vendor.pan_number} mono />
                    <InfoRow label="CIN Number" value={vendor.cin_number} mono />
                    <InfoRow label="State" value={vendor.state} />
                    <InfoRow label="Country" value={vendor.country} />
                  </dl>
                </div>
              </Section>

              {/* Business Details */}
              <Section title="Business Details" icon={Building2}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <dl>
                    <InfoRow label="Industry" value={vendor.industry_name} />
                    <InfoRow label="Company Size" value={vendor.company_size} />
                    <InfoRow label="Annual Turnover" value={vendor.annual_turnover ? `₹${vendor.annual_turnover.toLocaleString()}` : null} />
                    <InfoRow label="Primary Market" value={vendor.primary_market} />
                  </dl>
                  <dl>
                    <InfoRow 
                      label="Website" 
                      value={vendor.website ? (
                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          {vendor.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : null} 
                    />
                    <InfoRow label="MSME Status" value={vendor.is_msme ? `Yes (${vendor.msme_category || 'N/A'})` : 'No'} />
                    <InfoRow label="MSME Number" value={vendor.msme_number} mono />
                  </dl>
                </div>
                {vendor.services_products && vendor.services_products.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Services / Products:</p>
                    <div className="flex flex-wrap gap-2">
                      {vendor.services_products.map((item, index) => (
                        <Badge key={index} color="blue">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* Contacts */}
              <Section title="Contacts" icon={Users}>
                {vendor.contacts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No contacts added</p>
                ) : (
                  <div className="space-y-4">
                    {vendor.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{contact.name}</span>
                            {contact.is_primary && <Badge color="blue">Primary</Badge>}
                            {contact.is_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                          {contact.designation && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{contact.designation}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600">
                                <Mail className="w-4 h-4" />
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600">
                                <Phone className="w-4 h-4" />
                                {contact.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Addresses */}
              <Section title="Addresses" icon={MapPin}>
                {vendor.addresses.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No addresses added</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendor.addresses.map((address) => (
                      <div key={address.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {address.address_type.replace('_', ' ')} Address
                          </span>
                          {address.is_primary && <Badge color="blue">Primary</Badge>}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {address.address_line1}
                          {address.address_line2 && <><br />{address.address_line2}</>}
                          <br />
                          {address.city}, {address.state} - {address.pincode}
                          <br />
                          {address.country}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Banking */}
              <Section title="Banking Details" icon={CreditCard}>
                {vendor.banks.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No bank accounts added</p>
                ) : (
                  <div className="space-y-4">
                    {vendor.banks.map((bank) => (
                      <div key={bank.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{bank.bank_name}</span>
                            {bank.is_primary && <Badge color="blue">Primary</Badge>}
                            {bank.is_verified && <Badge color="green">Verified</Badge>}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 text-sm">
                          <dl>
                            <InfoRow label="Account Holder" value={bank.account_holder_name} />
                            <InfoRow label="Account Number" value={`****${bank.account_number.slice(-4)}`} mono />
                            <InfoRow label="Account Type" value={bank.account_type} />
                          </dl>
                          <dl>
                            <InfoRow label="IFSC Code" value={bank.ifsc_code} mono />
                            <InfoRow label="Branch" value={bank.branch_name} />
                            <InfoRow label="UPI ID" value={bank.upi_id} />
                          </dl>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Compliance Score */}
              <Section title="Compliance Score" icon={Shield}>
                <ComplianceScoreBar score={vendor.compliance_score} />
                <div className="mt-4 space-y-2 text-sm">
                  <InfoRow label="Last Audit" value={vendor.last_audit_date ? new Date(vendor.last_audit_date).toLocaleDateString() : 'Not audited'} />
                  <InfoRow label="Documents" value={`${vendor.documents.filter(d => d.verification_status === 'verified').length}/${vendor.documents.length} verified`} />
                </div>
              </Section>

              {/* Payment Terms */}
              <Section title="Payment Terms" icon={CreditCard}>
                <dl className="space-y-2">
                  <InfoRow label="Terms" value={vendor.default_payment_terms?.replace('_', ' ')} />
                  <InfoRow label="Credit Limit" value={vendor.credit_limit ? `₹${vendor.credit_limit.toLocaleString()}` : 'Not set'} />
                  <InfoRow label="Credit Days" value={vendor.credit_days} />
                  <InfoRow label="TDS Applicable" value={vendor.tds_applicable ? `Yes (${vendor.tds_section})` : 'No'} />
                  {vendor.tds_applicable && <InfoRow label="TDS Rate" value={`${vendor.tds_rate}%`} />}
                </dl>
              </Section>

              {/* Risk Assessment */}
              {vendor.riskAssessments.length > 0 && (
                <Section title="Latest Risk Assessment" icon={AlertTriangle}>
                  {(() => {
                    const latest = vendor.riskAssessments[0];
                    return (
                      <dl className="space-y-2">
                        <InfoRow label="Date" value={new Date(latest.assessment_date).toLocaleDateString()} />
                        <InfoRow label="Type" value={latest.assessment_type} />
                        <InfoRow label="Risk Level" value={latest.overall_risk_level} />
                        <InfoRow label="Internal Rating" value={latest.internal_rating ? `${latest.internal_rating}/5` : null} />
                        <InfoRow label="Background Check" value={latest.background_check_status} />
                        <InfoRow label="Blacklist Check" value={latest.blacklist_check_status} />
                        <InfoRow label="Assessed By" value={latest.assessed_by_name} />
                      </dl>
                    );
                  })()}
                </Section>
              )}

              {/* Tags & Notes */}
              {((vendor.tags && vendor.tags.length > 0) || vendor.notes) && (
                <Section title="Notes & Tags" icon={FileText}>
                  {vendor.tags && vendor.tags.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {vendor.tags.map((tag, index) => (
                          <Badge key={index}>{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {vendor.notes && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notes:</p>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{vendor.notes}</p>
                    </div>
                  )}
                </Section>
              )}

              {/* Metadata */}
              <Section title="Metadata" icon={Clock}>
                <dl className="space-y-2 text-sm">
                  <InfoRow label="Created" value={new Date(vendor.created_at).toLocaleString()} />
                  <InfoRow label="Created By" value={vendor.created_by_name} />
                  <InfoRow label="Updated" value={new Date(vendor.updated_at).toLocaleString()} />
                  <InfoRow label="Updated By" value={vendor.updated_by_name} />
                </dl>
              </Section>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <Section title="Documents" icon={FileText} actions={
            permissions.UPLOAD_VENDOR_DOC && (
              <button
                onClick={() => router.push(`/vendors/${vendorId}/documents`)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            )
          }>
            {vendor.documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No documents uploaded</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {vendor.documents.map((doc) => {
                  const verifyConfig = DOC_VERIFICATION_CONFIG[doc.verification_status] || DOC_VERIFICATION_CONFIG.pending;
                  const VerifyIcon = verifyConfig.icon;
                  
                  return (
                    <div key={doc.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <FileText className="w-6 h-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {doc.file_name}
                            {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                          </p>
                          {doc.expiry_date && (
                            <p className={`text-xs ${new Date(doc.expiry_date) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-1 text-sm ${verifyConfig.color}`}>
                          <VerifyIcon className="w-4 h-4" />
                          {verifyConfig.label}
                        </div>
                        {doc.is_mandatory && (
                          <Badge color="red">Mandatory</Badge>
                        )}
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {/* History & Audit Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Approval History */}
            <Section title="Approval History" icon={CheckCircle}>
              {vendor.approvals.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No approval history</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-6">
                    {vendor.approvals.map((approval) => (
                      <div key={approval.id} className="relative pl-10">
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${
                          approval.decision === 'approved' ? 'bg-green-500 border-green-500' :
                          approval.decision === 'rejected' ? 'bg-red-500 border-red-500' :
                          'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                        }`} />
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900 dark:text-white capitalize">
                              {approval.workflow_stage.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(approval.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {approval.decision ? (
                              <>
                                <span className={approval.decision === 'approved' ? 'text-green-600' : 'text-red-600'}>
                                  {approval.decision.toUpperCase()}
                                </span>
                                {approval.approver_name && ` by ${approval.approver_name}`}
                              </>
                            ) : (
                              <span className="text-yellow-600">Pending</span>
                            )}
                          </div>
                          {approval.remarks && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                              "{approval.remarks}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Audit Log */}
            <Section title="Audit Trail" icon={History}>
              {vendor.recentAudit.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No audit records</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
                        <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Action</th>
                        <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">User</th>
                        <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendor.recentAudit.map((log) => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 text-gray-500 dark:text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <Badge color={
                              log.action === 'created' ? 'green' :
                              log.action === 'updated' ? 'blue' :
                              log.action === 'deleted' ? 'red' :
                              log.action === 'approved' ? 'green' :
                              log.action === 'rejected' ? 'red' :
                              'gray'
                            }>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="py-3 text-gray-900 dark:text-white">
                            {log.actor_name || 'System'}
                            {log.actor_role && (
                              <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                                ({log.actor_role})
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-gray-500 dark:text-gray-400">
                            {log.field_name && (
                              <span>
                                {log.field_name}: {log.old_value || '(empty)'} → {log.new_value || '(empty)'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
