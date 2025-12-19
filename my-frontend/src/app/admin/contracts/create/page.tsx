"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, ChevronRight, Check, Building2, Truck, Users, FileText,
  Calendar, DollarSign, Upload, AlertCircle, Save
} from 'lucide-react';

// Types
type ContractType = 'RENT' | 'VEHICLE' | 'VENDOR' | 'CUSTOM';
type PartyType = 'INDIVIDUAL' | 'COMPANY';
type PaymentCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

interface BasicInfo {
  contract_type: ContractType;
  title: string;
  description: string;
  party_name: string;
  party_type: PartyType;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  party_address: string;
  party_gst: string;
  party_pan: string;
}

interface DateInfo {
  start_date: string;
  end_date: string;
  signed_date: string;
  auto_renew: boolean;
  renewal_period_months: number;
  notice_period_days: number;
}

interface FinancialInfo {
  monthly_amount: number;
  advance_amount: number;
  security_deposit: number;
  tax_type: string;
  tax_percentage: number;
  payment_cycle: PaymentCycle;
  payment_due_day: number;
  escalation_percentage: number;
  escalation_frequency: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
}

interface RentDetails {
  property_type: string;
  property_address: string;
  property_area_sqft: number;
  maintenance_charges: number;
  electricity_included: boolean;
  water_included: boolean;
}

interface VehicleDetails {
  vehicle_type: string;
  vehicle_number: string;
  vehicle_model: string;
  vehicle_make: string;
  fuel_type: string;
  per_km_rate: number;
  included_km_monthly: number;
  excess_km_rate: number;
  driver_included: boolean;
  driver_name: string;
  driver_phone: string;
}

interface VendorDetails {
  service_category: string;
  service_description: string;
  payment_model: string;
  sla_level: string;
  sla_response_hours: number;
  sla_resolution_hours: number;
  penalty_clause: string;
  penalty_percentage: number;
}

const STEPS = [
  { id: 1, name: 'Basic Info', icon: FileText },
  { id: 2, name: 'Dates', icon: Calendar },
  { id: 3, name: 'Financials', icon: DollarSign },
  { id: 4, name: 'Details', icon: Building2 },
  { id: 5, name: 'Review', icon: Check },
];

const CONTRACT_TYPES = [
  { value: 'RENT', label: 'Rent Agreement', icon: Building2, description: 'Property rental contracts' },
  { value: 'VEHICLE', label: 'Vehicle Hire', icon: Truck, description: 'Vehicle rental agreements' },
  { value: 'VENDOR', label: 'Vendor Contract', icon: Users, description: 'Service provider agreements' },
  { value: 'CUSTOM', label: 'Custom Contract', icon: FileText, description: 'Other contract types' },
];

export default function CreateContractPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    contract_type: 'RENT',
    title: '',
    description: '',
    party_name: '',
    party_type: 'COMPANY',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    party_address: '',
    party_gst: '',
    party_pan: '',
  });

  const [dateInfo, setDateInfo] = useState<DateInfo>({
    start_date: '',
    end_date: '',
    signed_date: '',
    auto_renew: false,
    renewal_period_months: 12,
    notice_period_days: 30,
  });

  const [financialInfo, setFinancialInfo] = useState<FinancialInfo>({
    monthly_amount: 0,
    advance_amount: 0,
    security_deposit: 0,
    tax_type: 'GST',
    tax_percentage: 18,
    payment_cycle: 'MONTHLY',
    payment_due_day: 1,
    escalation_percentage: 0,
    escalation_frequency: 'YEARLY',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
  });

  const [rentDetails, setRentDetails] = useState<RentDetails>({
    property_type: 'OFFICE',
    property_address: '',
    property_area_sqft: 0,
    maintenance_charges: 0,
    electricity_included: false,
    water_included: false,
  });

  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails>({
    vehicle_type: 'CAR',
    vehicle_number: '',
    vehicle_model: '',
    vehicle_make: '',
    fuel_type: 'PETROL',
    per_km_rate: 0,
    included_km_monthly: 0,
    excess_km_rate: 0,
    driver_included: false,
    driver_name: '',
    driver_phone: '',
  });

  const [vendorDetails, setVendorDetails] = useState<VendorDetails>({
    service_category: '',
    service_description: '',
    payment_model: 'FIXED_MONTHLY',
    sla_level: 'STANDARD',
    sla_response_hours: 24,
    sla_resolution_hours: 72,
    penalty_clause: '',
    penalty_percentage: 0,
  });

  // Validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!basicInfo.title || !basicInfo.party_name) {
          setError('Title and Party Name are required');
          return false;
        }
        break;
      case 2:
        if (!dateInfo.start_date || !dateInfo.end_date) {
          setError('Start and End dates are required');
          return false;
        }
        if (new Date(dateInfo.end_date) <= new Date(dateInfo.start_date)) {
          setError('End date must be after start date');
          return false;
        }
        break;
      case 3:
        if (financialInfo.monthly_amount <= 0) {
          setError('Monthly amount is required');
          return false;
        }
        if (financialInfo.advance_amount > financialInfo.monthly_amount * 12) {
          setError('Advance cannot exceed 12 months of rent');
          return false;
        }
        break;
      case 4:
        if (basicInfo.contract_type === 'RENT' && !rentDetails.property_address) {
          setError('Property address is required for rent contracts');
          return false;
        }
        if (basicInfo.contract_type === 'VEHICLE' && !vehicleDetails.vehicle_number) {
          setError('Vehicle number is required');
          return false;
        }
        if (basicInfo.contract_type === 'VENDOR' && !vendorDetails.payment_model) {
          setError('Payment model is required for vendor contracts');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      // Build payload
      const payload: any = {
        ...basicInfo,
        ...dateInfo,
        financials: financialInfo,
      };

      // Add type-specific details
      if (basicInfo.contract_type === 'RENT') {
        payload.rent_details = rentDetails;
      } else if (basicInfo.contract_type === 'VEHICLE') {
        payload.vehicle_details = vehicleDetails;
      } else if (basicInfo.contract_type === 'VENDOR') {
        payload.vendor_details = vendorDetails;
      }

      const res = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create contract');
      }

      const data = await res.json();
      router.push(`/admin/contracts/${data.data?.id || data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step Components
  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      {/* Contract Type Selection */}
      <div>
        <label className="block text-sm font-medium mb-3">Contract Type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CONTRACT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = basicInfo.contract_type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setBasicInfo({ ...basicInfo, contract_type: type.value as ContractType })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-violet-600' : 'text-gray-400'}`} />
                <div className={`font-medium ${isSelected ? 'text-violet-700 dark:text-violet-300' : ''}`}>
                  {type.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Contract Title *</label>
          <input
            type="text"
            value={basicInfo.title}
            onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            placeholder="e.g., Office Rent - Main Branch"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            value={basicInfo.description}
            onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            placeholder="Brief description"
          />
        </div>
      </div>

      {/* Party Information */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-medium mb-4">Party Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Party Name *</label>
            <input
              type="text"
              value={basicInfo.party_name}
              onChange={(e) => setBasicInfo({ ...basicInfo, party_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Company or Individual name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Party Type</label>
            <select
              value={basicInfo.party_type}
              onChange={(e) => setBasicInfo({ ...basicInfo, party_type: e.target.value as PartyType })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="COMPANY">Company</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Person</label>
            <input
              type="text"
              value={basicInfo.contact_person}
              onChange={(e) => setBasicInfo({ ...basicInfo, contact_person: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Phone</label>
            <input
              type="tel"
              value={basicInfo.contact_phone}
              onChange={(e) => setBasicInfo({ ...basicInfo, contact_phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Email</label>
            <input
              type="email"
              value={basicInfo.contact_email}
              onChange={(e) => setBasicInfo({ ...basicInfo, contact_email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GST Number</label>
            <input
              type="text"
              value={basicInfo.party_gst}
              onChange={(e) => setBasicInfo({ ...basicInfo, party_gst: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              value={basicInfo.party_address}
              onChange={(e) => setBasicInfo({ ...basicInfo, party_address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDatesStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <input
            type="date"
            value={dateInfo.start_date}
            onChange={(e) => setDateInfo({ ...dateInfo, start_date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date *</label>
          <input
            type="date"
            value={dateInfo.end_date}
            onChange={(e) => setDateInfo({ ...dateInfo, end_date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Signed Date</label>
          <input
            type="date"
            value={dateInfo.signed_date}
            onChange={(e) => setDateInfo({ ...dateInfo, signed_date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-4">Renewal Settings</h3>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dateInfo.auto_renew}
              onChange={(e) => setDateInfo({ ...dateInfo, auto_renew: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Auto-renew contract</span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Renewal Period (months)</label>
            <input
              type="number"
              value={dateInfo.renewal_period_months}
              onChange={(e) => setDateInfo({ ...dateInfo, renewal_period_months: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notice Period (days)</label>
            <input
              type="number"
              value={dateInfo.notice_period_days}
              onChange={(e) => setDateInfo({ ...dateInfo, notice_period_days: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancialsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Monthly Amount *</label>
          <input
            type="number"
            value={financialInfo.monthly_amount}
            onChange={(e) => setFinancialInfo({ ...financialInfo, monthly_amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Advance Amount</label>
          <input
            type="number"
            value={financialInfo.advance_amount}
            onChange={(e) => setFinancialInfo({ ...financialInfo, advance_amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Security Deposit</label>
          <input
            type="number"
            value={financialInfo.security_deposit}
            onChange={(e) => setFinancialInfo({ ...financialInfo, security_deposit: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            min={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tax Type</label>
          <select
            value={financialInfo.tax_type}
            onChange={(e) => setFinancialInfo({ ...financialInfo, tax_type: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="GST">GST</option>
            <option value="VAT">VAT</option>
            <option value="NONE">No Tax</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tax Percentage</label>
          <input
            type="number"
            value={financialInfo.tax_percentage}
            onChange={(e) => setFinancialInfo({ ...financialInfo, tax_percentage: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            min={0}
            max={100}
            step={0.1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Payment Cycle</label>
          <select
            value={financialInfo.payment_cycle}
            onChange={(e) => setFinancialInfo({ ...financialInfo, payment_cycle: e.target.value as PaymentCycle })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Payment Due Day</label>
          <input
            type="number"
            value={financialInfo.payment_due_day}
            onChange={(e) => setFinancialInfo({ ...financialInfo, payment_due_day: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            min={1}
            max={31}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Escalation %</label>
          <input
            type="number"
            value={financialInfo.escalation_percentage}
            onChange={(e) => setFinancialInfo({ ...financialInfo, escalation_percentage: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            min={0}
            max={100}
            step={0.1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Escalation Frequency</label>
          <select
            value={financialInfo.escalation_frequency}
            onChange={(e) => setFinancialInfo({ ...financialInfo, escalation_frequency: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="YEARLY">Yearly</option>
            <option value="BI_YEARLY">Every 2 Years</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-4">Bank Details (for payments)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <input
              type="text"
              value={financialInfo.bank_name}
              onChange={(e) => setFinancialInfo({ ...financialInfo, bank_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account Number</label>
            <input
              type="text"
              value={financialInfo.bank_account_number}
              onChange={(e) => setFinancialInfo({ ...financialInfo, bank_account_number: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IFSC Code</label>
            <input
              type="text"
              value={financialInfo.bank_ifsc}
              onChange={(e) => setFinancialInfo({ ...financialInfo, bank_ifsc: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsStep = () => {
    switch (basicInfo.contract_type) {
      case 'RENT':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Rent Agreement Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Property Type</label>
                <select
                  value={rentDetails.property_type}
                  onChange={(e) => setRentDetails({ ...rentDetails, property_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="OFFICE">Office</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="SHOP">Shop</option>
                  <option value="GODOWN">Godown</option>
                  <option value="LAND">Land</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Area (sq.ft)</label>
                <input
                  type="number"
                  value={rentDetails.property_area_sqft}
                  onChange={(e) => setRentDetails({ ...rentDetails, property_area_sqft: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Property Address *</label>
                <textarea
                  value={rentDetails.property_address}
                  onChange={(e) => setRentDetails({ ...rentDetails, property_address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Maintenance Charges</label>
                <input
                  type="number"
                  value={rentDetails.maintenance_charges}
                  onChange={(e) => setRentDetails({ ...rentDetails, maintenance_charges: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rentDetails.electricity_included}
                    onChange={(e) => setRentDetails({ ...rentDetails, electricity_included: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Electricity Included</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rentDetails.water_included}
                    onChange={(e) => setRentDetails({ ...rentDetails, water_included: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Water Included</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'VEHICLE':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Vehicle Hire Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Type</label>
                <select
                  value={vehicleDetails.vehicle_type}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="CAR">Car</option>
                  <option value="TRUCK">Truck</option>
                  <option value="VAN">Van</option>
                  <option value="BIKE">Bike</option>
                  <option value="TEMPO">Tempo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Number *</label>
                <input
                  type="text"
                  value={vehicleDetails.vehicle_number}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, vehicle_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="MH01AB1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fuel Type</label>
                <select
                  value={vehicleDetails.fuel_type}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, fuel_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="ELECTRIC">Electric</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Make</label>
                <input
                  type="text"
                  value={vehicleDetails.vehicle_make}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, vehicle_make: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="e.g., Tata"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  type="text"
                  value={vehicleDetails.vehicle_model}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, vehicle_model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="e.g., Indica"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Per KM Rate</label>
                <input
                  type="number"
                  value={vehicleDetails.per_km_rate}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, per_km_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Included KM (monthly)</label>
                <input
                  type="number"
                  value={vehicleDetails.included_km_monthly}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, included_km_monthly: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Excess KM Rate</label>
                <input
                  type="number"
                  value={vehicleDetails.excess_km_rate}
                  onChange={(e) => setVehicleDetails({ ...vehicleDetails, excess_km_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vehicleDetails.driver_included}
                    onChange={(e) => setVehicleDetails({ ...vehicleDetails, driver_included: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Driver Included</span>
                </label>
              </div>
            </div>
            {vehicleDetails.driver_included && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={vehicleDetails.driver_name}
                    onChange={(e) => setVehicleDetails({ ...vehicleDetails, driver_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Driver Phone</label>
                  <input
                    type="tel"
                    value={vehicleDetails.driver_phone}
                    onChange={(e) => setVehicleDetails({ ...vehicleDetails, driver_phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'VENDOR':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Vendor Contract Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Category</label>
                <select
                  value={vendorDetails.service_category}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, service_category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Select Category</option>
                  <option value="LOGISTICS">Logistics</option>
                  <option value="IT">IT Services</option>
                  <option value="CLEANING">Cleaning</option>
                  <option value="SECURITY">Security</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Model *</label>
                <select
                  value={vendorDetails.payment_model}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, payment_model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="FIXED_MONTHLY">Fixed Monthly</option>
                  <option value="PER_ORDER">Per Order</option>
                  <option value="PER_KM">Per KM</option>
                  <option value="MILESTONE">Milestone Based</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Service Description</label>
                <textarea
                  value={vendorDetails.service_description}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, service_description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SLA Level</label>
                <select
                  value={vendorDetails.sla_level}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, sla_level: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Response Time (hours)</label>
                <input
                  type="number"
                  value={vendorDetails.sla_response_hours}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, sla_response_hours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Resolution Time (hours)</label>
                <input
                  type="number"
                  value={vendorDetails.sla_resolution_hours}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, sla_resolution_hours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Penalty %</label>
                <input
                  type="number"
                  value={vendorDetails.penalty_percentage}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, penalty_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  min={0}
                  max={100}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Penalty Clause</label>
                <textarea
                  value={vendorDetails.penalty_clause}
                  onChange={(e) => setVendorDetails({ ...vendorDetails, penalty_clause: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  rows={2}
                  placeholder="Describe penalty conditions..."
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No additional details required for custom contracts.</p>
          </div>
        );
    }
  };

  const renderReviewStep = () => {
    const totalValue = financialInfo.monthly_amount * 12;
    const taxAmount = totalValue * (financialInfo.tax_percentage / 100);
    
    return (
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-800 dark:text-green-300 mb-2">Contract Summary</h3>
          <p className="text-sm text-green-600 dark:text-green-400">Please review all details before creating the contract.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info Summary */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Basic Information
            </h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Type:</dt>
                <dd className="font-medium">{basicInfo.contract_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Title:</dt>
                <dd className="font-medium">{basicInfo.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Party:</dt>
                <dd className="font-medium">{basicInfo.party_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Contact:</dt>
                <dd className="font-medium">{basicInfo.contact_person || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* Dates Summary */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Contract Duration
            </h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Start Date:</dt>
                <dd className="font-medium">{dateInfo.start_date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">End Date:</dt>
                <dd className="font-medium">{dateInfo.end_date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Auto Renew:</dt>
                <dd className="font-medium">{dateInfo.auto_renew ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Notice Period:</dt>
                <dd className="font-medium">{dateInfo.notice_period_days} days</dd>
              </div>
            </dl>
          </div>

          {/* Financial Summary */}
          <div className="border rounded-lg p-4 md:col-span-2">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Financial Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Monthly Amount</dt>
                <dd className="font-medium text-lg">₹ {financialInfo.monthly_amount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Advance</dt>
                <dd className="font-medium text-lg">₹ {financialInfo.advance_amount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Security Deposit</dt>
                <dd className="font-medium text-lg">₹ {financialInfo.security_deposit.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Annual Value (excl. tax)</dt>
                <dd className="font-medium text-lg">₹ {totalValue.toLocaleString()}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/compliance/agreements')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Create New Contract</h1>
              <p className="text-sm text-gray-500">Step {currentStep} of 5 - {STEPS[currentStep - 1].name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-1 ${isCurrent ? 'text-violet-600 font-medium' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {currentStep === 1 && renderBasicInfoStep()}
          {currentStep === 2 && renderDatesStep()}
          {currentStep === 3 && renderFinancialsStep()}
          {currentStep === 4 && renderDetailsStep()}
          {currentStep === 5 && renderReviewStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Contract
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
