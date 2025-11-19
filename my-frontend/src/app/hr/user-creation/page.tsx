/**
 * User Creation Page - App Router
 * Two-stage user creation: HR creates request → sends KYC link OR creates immediately
 */
'use client';

import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { UserPlus, Mail, Phone, MapPin, Briefcase, AlertCircle } from 'lucide-react';

// Types
type SimpleUser = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  role?: string;
  active?: boolean;
};

type OfficeLocation = {
  id: string;
  name: string;
  code: string;
};

// Mock data (replace with real API calls later)
const MOCK_USERS: SimpleUser[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', employeeId: 'EMP-001', role: 'MANAGER', active: true },
  { id: '2', firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP-002', role: 'HUB_INCHARGE', active: true },
  { id: '3', firstName: 'Mike', lastName: 'Johnson', employeeId: 'EMP-003', role: 'MANAGER_LEVEL', active: true },
];

const MOCK_LOCATIONS: OfficeLocation[] = [
  { id: '1', name: 'Head Office', code: 'HO' },
  { id: '2', name: 'Branch Office - Mumbai', code: 'BR-MUM' },
  { id: '3', name: 'Branch Office - Delhi', code: 'BR-DEL' },
];

export default function UserCreationPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [reportingAuthorityId, setReportingAuthorityId] = useState<string>('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');

  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load mock data on mount
  useEffect(() => {
    setTimeout(() => {
      setUsers(MOCK_USERS);
      setLocations(MOCK_LOCATIONS);
      setLoadingData(false);
    }, 500);
  }, []);

  const selectedAuthority = users.find(u => u.id === reportingAuthorityId);
  const approverId = reportingAuthorityId || null;

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(mobile.replace(/[\s()-]/g, ''))) {
      newErrors.mobile = 'Invalid mobile format';
    }
    if (!reportingAuthorityId) {
      newErrors.reportingAuthorityId = 'Reporting authority is required';
    }
    if (!officeLocation.trim()) newErrors.officeLocation = 'Office location is required';
    if (!role.trim()) newErrors.role = 'Role is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSendKYCLink() {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // TODO: Call API endpoint POST /api/user-requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast(`KYC link will be sent to ${email}. (API not implemented yet)`, 'success');
      
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setMobile('');
      setReportingAuthorityId('');
      setOfficeLocation('');
      setRole('');
      setNotes('');
      setErrors({});
    } catch (error: any) {
      showToast(error.message || 'Failed to send KYC link', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleOverrideCreate() {
    if (!validateForm()) return;
    if (!overrideConfirmed) {
      setShowOverrideModal(true);
      return;
    }

    setLoading(true);
    try {
      // TODO: Call API endpoint POST /api/users
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast(`User would be created. (API not implemented yet)`, 'success');

      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setMobile('');
      setReportingAuthorityId('');
      setOfficeLocation('');
      setRole('');
      setNotes('');
      setErrors({});
      setOverrideConfirmed(false);
      setShowOverrideModal(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SuperAdminLayout title="Create New User">
      <div className="p-6 max-w-5xl">
        {/* Toast Notification */}
        {toast && (
          <div
            role="alert"
            aria-live="polite"
            className={`mb-4 p-4 rounded-md ${
              toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loadingData}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loadingData}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email and Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loadingData}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+1234567890"
                  disabled={loadingData}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.mobile && <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>}
              </div>
            </div>

            {/* Reporting Authority */}
            <div>
              <label htmlFor="reportingAuthority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <UserPlus className="w-4 h-4 inline mr-1" />
                Reporting Authority <span className="text-red-500">*</span>
              </label>
              {loadingData ? (
                <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
              ) : (
                <select
                  id="reportingAuthority"
                  value={reportingAuthorityId}
                  onChange={(e) => setReportingAuthorityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Reporting Authority</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} {user.employeeId ? `• ${user.employeeId}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The selected Reporting Authority will act as the approver for this user.
              </p>
              {errors.reportingAuthorityId && <p className="mt-1 text-sm text-red-600">{errors.reportingAuthorityId}</p>}
            </div>

            {/* Approver (Auto-populated) */}
            {reportingAuthorityId && selectedAuthority && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Approver (Auto-assigned)
                </label>
                <input
                  type="text"
                  value={`${selectedAuthority.firstName} ${selectedAuthority.lastName} ${selectedAuthority.employeeId ? `• ${selectedAuthority.employeeId}` : ''}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Automatically set to the Reporting Authority</p>
              </div>
            )}

            {/* Office Location and Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="officeLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Office Location <span className="text-red-500">*</span>
                </label>
                {loadingData ? (
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
                ) : (
                  <select
                    id="officeLocation"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Office Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.code}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                )}
                {errors.officeLocation && <p className="mt-1 text-sm text-red-600">{errors.officeLocation}</p>}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loadingData}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Role</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HUB_INCHARGE">Hub Incharge</option>
                  <option value="MANAGER_LEVEL">Manager Level</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={loadingData}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Any additional information..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleSendKYCLink}
                disabled={loading || loadingData}
                className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Sending...' : 'Send KYC Link'}
              </button>

              <button
                type="button"
                onClick={handleOverrideCreate}
                disabled={loading || loadingData}
                className="px-6 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Override & Create
              </button>
            </div>
          </form>
        </div>

        {/* Override Confirmation Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirm Override & Create</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Create user immediately and skip KYC? This will create the account and assign approver = reporting authority.
                <strong className="block mt-2 text-red-600 dark:text-red-400">This action is auditable.</strong>
              </p>
              <div className="flex items-start mb-6">
                <input
                  type="checkbox"
                  id="confirmOverride"
                  checked={overrideConfirmed}
                  onChange={(e) => setOverrideConfirmed(e.target.checked)}
                  className="mt-1 mr-2 w-4 h-4"
                />
                <label htmlFor="confirmOverride" className="text-sm text-gray-700 dark:text-gray-300">
                  I confirm I want to create this user immediately and accept responsibility for bypassing the KYC process.
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOverrideModal(false);
                    setOverrideConfirmed(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideCreate}
                  disabled={!overrideConfirmed}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

