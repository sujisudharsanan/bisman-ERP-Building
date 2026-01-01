'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  ChevronRight,
  MapPin,
  FileText,
  Calendar,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  X,
  TrendingUp,
  Building,
  FileSignature,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AddBranchDrawer from '@/components/branch-management/AddBranchDrawer';

// ============================================================================
// TYPES
// ============================================================================

interface BranchData {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
  areaSquareFeet: number | null;
  buildingType: 'owned' | 'rented' | 'leased';
  isActive: boolean;
  
  // Agreement details
  agreementType?: 'rent' | 'lease';
  agreementStartDate?: string;
  agreementEndDate?: string;
  monthlyRent?: number | null;
  rentEscalationPercent?: number | null;
  securityDeposit?: number | null;
  noticePeriodDays?: number | null;
  autoRenew?: boolean;
  agreementReminderDays?: number | null;
  
  // Owner/Vendor PAN details
  panHolderName?: string;
  panNumber?: string;
  gstNumber?: string;
  
  // Data completeness
  dataStatus: 'complete' | 'incomplete' | 'missing-critical';
  missingFields: string[];
}

interface KPIData {
  totalBranches: number;
  activeAgreements: number;
  expiringAgreements: number;
  totalRentLiability: number;
  totalSecurityDeposit: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysUntilExpiry(endDate: string | undefined): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getAgreementStatus(endDate: string | undefined): 'active' | 'expiring' | 'expired' {
  const days = getDaysUntilExpiry(endDate);
  if (days === null) return 'active';
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'active';
}

function getDataStatusBadge(status: string, missingFields: string[]) {
  const colors = {
    complete: 'bg-green-100 text-green-700',
    incomplete: 'bg-amber-100 text-amber-700',
    'missing-critical': 'bg-red-100 text-red-700',
  };
  
  const labels = {
    complete: 'Complete',
    incomplete: 'Incomplete',
    'missing-critical': 'Missing Critical',
  };
  
  return (
    <div className="relative group">
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || colors.incomplete}`}>
        {labels[status as keyof typeof labels] || 'Unknown'}
      </span>
      {missingFields.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
            <div className="font-semibold mb-1">Missing Fields:</div>
            {missingFields.map((f, i) => (
              <div key={i}>• {f}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

function KPICard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  subtitle?: string;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };
  
  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className={`bg-white rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BRANCH DETAIL PANEL COMPONENT
// ============================================================================

function BranchDetailPanel({
  branch,
  onClose,
  onEdit,
}: {
  branch: BranchData | null;
  onClose: () => void;
  onEdit: (branch: BranchData) => void;
}) {
  if (!branch) return null;
  
  const agreementStatus = getAgreementStatus(branch.agreementEndDate);
  const daysUntilExpiry = getDaysUntilExpiry(branch.agreementEndDate);
  const needsAgreement = branch.buildingType === 'rented' || branch.buildingType === 'leased';
  
  // Financial exposure calculations
  const monthlyLiability = branch.monthlyRent || 0;
  const annualLiability = monthlyLiability * 12;
  const securityDepositAmount = branch.securityDeposit || 0;
  const totalExposure = monthlyLiability + securityDepositAmount;

  return (
    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-40 border-l overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{branch.name}</h2>
          <p className="text-sm text-gray-500">{branch.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(branch)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Edit Branch"
          >
            <Edit className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Section A: Branch Overview */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Branch Overview
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-xs text-gray-500">Address</span>
              <p className="text-sm font-medium">{branch.address}</p>
              <p className="text-sm text-gray-600">
                {branch.city}, {branch.district}, {branch.state} - {branch.pincode}
              </p>
            </div>
            {branch.areaSquareFeet && (
              <div>
                <span className="text-xs text-gray-500">Area</span>
                <p className="text-sm font-medium">{branch.areaSquareFeet.toLocaleString()} Sq Ft</p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500">Building Type</span>
              <p className="text-sm font-medium capitalize">{branch.buildingType}</p>
            </div>
          </div>
        </div>
        
        {/* Section B: Agreement Details */}
        {needsAgreement && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              Agreement Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Agreement Type</span>
                  <p className="text-sm font-medium capitalize">{branch.agreementType || 'Not Set'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Status</span>
                  <p className={`text-sm font-medium ${
                    agreementStatus === 'expired' ? 'text-red-600' :
                    agreementStatus === 'expiring' ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {agreementStatus === 'expired' ? '⛔ Expired' :
                     agreementStatus === 'expiring' ? '⚠️ Expiring Soon' : '✓ Active'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Start Date</span>
                  <p className="text-sm font-medium">{formatDate(branch.agreementStartDate)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">End Date</span>
                  <p className={`text-sm font-medium ${daysUntilExpiry !== null && daysUntilExpiry <= 30 ? 'text-red-600' : ''}`}>
                    {formatDate(branch.agreementEndDate)}
                  </p>
                </div>
              </div>
              {daysUntilExpiry !== null && (
                <div className={`p-2 rounded-lg text-sm ${
                  daysUntilExpiry < 0 ? 'bg-red-100 text-red-700' :
                  daysUntilExpiry <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {daysUntilExpiry < 0 
                    ? `Expired ${Math.abs(daysUntilExpiry)} days ago` 
                    : `${daysUntilExpiry} days until expiry`}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Monthly Rent</span>
                  <p className="text-sm font-medium">{formatCurrency(branch.monthlyRent)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Security Deposit</span>
                  <p className="text-sm font-medium">{formatCurrency(branch.securityDeposit)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Section C: Owner/Vendor PAN Details */}
        {needsAgreement && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Owner / Vendor PAN Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-xs text-gray-500">PAN Holder Name</span>
                <p className="text-sm font-medium">{branch.panHolderName || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">PAN Number</span>
                <p className="text-sm font-medium font-mono">{branch.panNumber || 'Not provided'}</p>
              </div>
              {branch.gstNumber && (
                <div>
                  <span className="text-xs text-gray-500">GST Number</span>
                  <p className="text-sm font-medium font-mono">{branch.gstNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Section D: Financial Exposure (Read-only) */}
        {needsAgreement && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Financial Exposure
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-600">Monthly Liability</span>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(monthlyLiability)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-600">Annual Liability</span>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(annualLiability)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-600">Security Deposit</span>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(securityDepositAmount)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-600">Total Exposure</span>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(totalExposure)}</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 italic">
                * Financial data is system-calculated and read-only
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function BranchesPage() {
  const { user, loading: authLoading } = useAuth();
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [kpis, setKpis] = useState<KPIData>({
    totalBranches: 0,
    activeAgreements: 0,
    expiringAgreements: 0,
    totalRentLiability: 0,
    totalSecurityDeposit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [showAddBranchDrawer, setShowAddBranchDrawer] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchData | null>(null);

  // Handler to open edit drawer
  const handleEditBranch = (branch: BranchData) => {
    setEditBranch(branch);
    setShowAddBranchDrawer(true);
    setSelectedBranch(null); // Close detail panel
  };

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/branches?include_agreements=true', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }
      
      const data = await response.json();
      const branchList: BranchData[] = (data.branches || data || []).map((b: any) => ({
        ...b,
        dataStatus: determineDataStatus(b),
        missingFields: getMissingFields(b),
      }));
      
      setBranches(branchList);
      calculateKPIs(branchList);
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Use mock data for demo
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const determineDataStatus = (branch: any): 'complete' | 'incomplete' | 'missing-critical' => {
    const needsAgreement = branch.buildingType === 'rented' || branch.buildingType === 'leased';
    if (!needsAgreement) return 'complete';
    
    if (!branch.agreementStartDate || !branch.agreementEndDate || !branch.panNumber) {
      return 'missing-critical';
    }
    if (!branch.monthlyRent || !branch.panHolderName) {
      return 'incomplete';
    }
    return 'complete';
  };

  const getMissingFields = (branch: any): string[] => {
    const missing: string[] = [];
    const needsAgreement = branch.buildingType === 'rented' || branch.buildingType === 'leased';
    if (!needsAgreement) return missing;
    
    if (!branch.agreementStartDate) missing.push('Agreement Start Date');
    if (!branch.agreementEndDate) missing.push('Agreement End Date');
    if (!branch.monthlyRent) missing.push('Monthly Rent');
    if (!branch.panHolderName) missing.push('PAN Holder Name');
    if (!branch.panNumber) missing.push('PAN Number');
    
    return missing;
  };

  const calculateKPIs = (branchList: BranchData[]) => {
    const rentedLeased = branchList.filter(b => b.buildingType === 'rented' || b.buildingType === 'leased');
    
    setKpis({
      totalBranches: branchList.length,
      activeAgreements: rentedLeased.filter(b => getAgreementStatus(b.agreementEndDate) === 'active').length,
      expiringAgreements: rentedLeased.filter(b => getAgreementStatus(b.agreementEndDate) === 'expiring').length,
      totalRentLiability: rentedLeased.reduce((sum, b) => sum + (b.monthlyRent || 0), 0),
      totalSecurityDeposit: rentedLeased.reduce((sum, b) => sum + (b.securityDeposit || 0), 0),
    });
  };

  const loadMockData = () => {
    const mockBranches: BranchData[] = [
      {
        id: '1',
        name: 'Mumbai Central',
        code: 'MUM-C01',
        address: '123 Business Park, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        district: 'Mumbai',
        pincode: '400093',
        areaSquareFeet: 2500,
        buildingType: 'rented',
        isActive: true,
        agreementType: 'rent',
        agreementStartDate: '2024-01-01',
        agreementEndDate: '2026-01-15',
        monthlyRent: 75000,
        securityDeposit: 225000,
        panHolderName: 'Rajesh Kumar',
        panNumber: 'ABCDE1234F',
        dataStatus: 'complete',
        missingFields: [],
      },
      {
        id: '2',
        name: 'Delhi Hub',
        code: 'DEL-H01',
        address: '456 Commercial Complex, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        district: 'Central Delhi',
        pincode: '110001',
        areaSquareFeet: 1800,
        buildingType: 'leased',
        isActive: true,
        agreementType: 'lease',
        agreementStartDate: '2023-06-01',
        agreementEndDate: '2026-01-20',
        monthlyRent: 95000,
        securityDeposit: 500000,
        panHolderName: 'Amit Sharma',
        panNumber: 'FGHIJ5678K',
        dataStatus: 'complete',
        missingFields: [],
      },
      {
        id: '3',
        name: 'Bangalore Tech Park',
        code: 'BLR-T01',
        address: '789 IT Hub, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        district: 'Bangalore Urban',
        pincode: '560066',
        areaSquareFeet: 3200,
        buildingType: 'owned',
        isActive: true,
        dataStatus: 'complete',
        missingFields: [],
      },
      {
        id: '4',
        name: 'Chennai Branch',
        code: 'CHN-B01',
        address: '321 Business Centre, T Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        district: 'Chennai',
        pincode: '600017',
        areaSquareFeet: 1500,
        buildingType: 'rented',
        isActive: true,
        agreementType: 'rent',
        agreementStartDate: '2024-03-01',
        agreementEndDate: '2025-02-28',
        monthlyRent: 45000,
        securityDeposit: 135000,
        dataStatus: 'missing-critical',
        missingFields: ['PAN Holder Name', 'PAN Number'],
      },
    ];
    
    setBranches(mockBranches);
    calculateKPIs(mockBranches);
  };

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Filter branches
  const filteredBranches = branches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter =
      filterType === 'all' ||
      branch.buildingType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
            <p className="text-sm text-gray-500 mt-1">
              Branch details, agreements, compliance & financial exposure
            </p>
          </div>
          <button
            onClick={() => setShowAddBranchDrawer(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Branch
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <KPICard
            title="Total Branches"
            value={kpis.totalBranches}
            icon={Building2}
            color="blue"
          />
          <KPICard
            title="Active Agreements"
            value={kpis.activeAgreements}
            icon={FileSignature}
            color="green"
            subtitle="Rented + Leased"
          />
          <KPICard
            title="Expiring Agreements"
            value={kpis.expiringAgreements}
            icon={AlertTriangle}
            color="amber"
            subtitle="≤ 30 days"
          />
          <KPICard
            title="Total Rent Liability"
            value={formatCurrency(kpis.totalRentLiability)}
            icon={IndianRupee}
            color="purple"
            subtitle="Monthly"
          />
          <KPICard
            title="Total Security Deposit"
            value={formatCurrency(kpis.totalSecurityDeposit)}
            icon={TrendingUp}
            color="blue"
            subtitle="Cumulative"
          />
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search branches by name, code, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="owned">Owned</option>
            <option value="rented">Rented</option>
            <option value="leased">Leased</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-amber-800 font-medium">Note: Using demo data</p>
              <p className="text-amber-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Branch Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Branch Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  State / District
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Building Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Agreement Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Agreement Expiry
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Monthly Rent
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Security Deposit
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Data Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No branches found
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch) => {
                  const agreementStatus = getAgreementStatus(branch.agreementEndDate);
                  const daysUntilExpiry = getDaysUntilExpiry(branch.agreementEndDate);
                  const needsAgreement = branch.buildingType === 'rented' || branch.buildingType === 'leased';
                  
                  return (
                    <tr
                      key={branch.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedBranch(branch)}
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-blue-600 hover:text-blue-800">
                          {branch.name}
                        </div>
                        <div className="text-xs text-gray-500">{branch.code}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {branch.state} / {branch.district}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                          branch.buildingType === 'owned' ? 'bg-green-100 text-green-700' :
                          branch.buildingType === 'rented' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {branch.buildingType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {needsAgreement ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            agreementStatus === 'expired' ? 'bg-red-100 text-red-700' :
                            agreementStatus === 'expiring' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {agreementStatus === 'expired' ? 'Expired' :
                             agreementStatus === 'expiring' ? 'Expiring' : 'Active'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {needsAgreement && branch.agreementEndDate ? (
                          <span className={daysUntilExpiry !== null && daysUntilExpiry <= 30 ? 'text-red-600 font-medium' : ''}>
                            {formatDate(branch.agreementEndDate)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-medium">
                        {branch.monthlyRent ? formatCurrency(branch.monthlyRent) : '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-medium">
                        {branch.securityDeposit ? formatCurrency(branch.securityDeposit) : '—'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getDataStatusBadge(branch.dataStatus, branch.missingFields)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBranch(branch);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBranch(branch);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branch Detail Panel */}
      {selectedBranch && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setSelectedBranch(null)}
          />
          <BranchDetailPanel
            branch={selectedBranch}
            onClose={() => setSelectedBranch(null)}
            onEdit={(branch) => {
              handleEditBranch(branch);
            }}
          />
        </>
      )}

      {/* Add/Edit Branch Drawer */}
      <AddBranchDrawer
        isOpen={showAddBranchDrawer}
        onClose={() => {
          setShowAddBranchDrawer(false);
          setEditBranch(null);
        }}
        onSuccess={() => {
          fetchBranches();
          setEditBranch(null);
        }}
        editBranch={editBranch ? {
          id: editBranch.id,
          name: editBranch.name,
          code: editBranch.code || '',
          address: editBranch.address,
          city: editBranch.city,
          state: editBranch.state,
          district: editBranch.district,
          pincode: editBranch.pincode,
          areaSquareFeet: editBranch.areaSquareFeet ?? '',
          buildingType: editBranch.buildingType,
          agreementType: editBranch.agreementType,
          agreementStartDate: editBranch.agreementStartDate,
          agreementEndDate: editBranch.agreementEndDate,
          monthlyRent: editBranch.monthlyRent ?? '',
          rentEscalationPercent: editBranch.rentEscalationPercent ?? '',
          securityDeposit: editBranch.securityDeposit ?? '',
          noticePeriodDays: editBranch.noticePeriodDays ?? '',
          autoRenew: editBranch.autoRenew,
          agreementReminderDays: editBranch.agreementReminderDays ?? '',
          panHolderName: editBranch.panHolderName,
          panNumber: editBranch.panNumber,
          gstNumber: editBranch.gstNumber,
          isActive: editBranch.isActive,
        } : null}
      />
    </div>
  );
}
