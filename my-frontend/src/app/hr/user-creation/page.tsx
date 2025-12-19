/**
 * User Creation Page - App Router
 * Two-stage user creation: HR creates request → sends KYC link OR creates immediately
 * Office Locations: Fetched from RENT type contracts (rental premises)
 * Roles: Fetched from database with permission filtering
 */
'use client';

import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { UserPlus, Mail, Phone, MapPin, Briefcase, AlertCircle, Building2, Info } from 'lucide-react';

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
  address?: string;
  contractId?: string;
};

type RoleOption = {
  id: string;
  name: string;
  displayName: string;
  description?: string;
};

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
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch data from APIs on mount
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        // Fetch reporting authorities (users who can be managers) using search endpoint
        const usersRes = await fetch('/api/users/search?q=&limit=100', {
          credentials: 'include'
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const allUsers = usersData.data?.users || usersData.users || usersData || [];
          // Filter to only show users who can be reporting authorities (managers, admins, etc.)
          const managerRoles = ['MANAGER', 'HUB_INCHARGE', 'ADMIN', 'MANAGER_LEVEL', 'STORE_INCHARGE', 'SYSTEM_ADMIN', 'SUPER_ADMIN'];
          const usersList = allUsers
            .filter((u: any) => {
              const role = (u.role || u.roleName || '').toUpperCase();
              return managerRoles.some(mr => role.includes(mr));
            })
            .map((u: any) => ({
              id: u.id || u.user_id,
              firstName: u.first_name || u.firstName || u.name?.split(' ')[0] || u.username || '',
              lastName: u.last_name || u.lastName || u.name?.split(' ').slice(1).join(' ') || '',
              employeeId: u.employee_id || u.employeeId,
              role: u.role || u.roleName,
              active: u.active !== false && u.isActive !== false
            }));
          setUsers(usersList);
        }

        // Fetch office locations from RENT contracts (rental premises)
        const locationsRes = await fetch('/api/admin/contracts?contract_type=RENT&status=ACTIVE', {
          credentials: 'include'
        });
        if (locationsRes.ok) {
          const locData = await locationsRes.json();
          const contracts = locData.data?.contracts || locData.contracts || [];
          const locationsList: OfficeLocation[] = contracts.map((c: any) => ({
            id: c.id,
            name: c.party_name || c.title || 'Unnamed Location',
            code: c.contract_number || `LOC-${c.id}`,
            address: c.rent_detail?.property_address || c.description || '',
            contractId: c.id
          }));
          setLocations(locationsList);
        } else {
          // If no contracts API, show empty state
          setLocations([]);
        }

        // Fetch assignable roles based on current user's permissions
        // This endpoint returns only roles the current user is allowed to assign
        const rolesRes = await fetch('/api/privileges/assignable-roles', {
          credentials: 'include'
        });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const rolesList = (rolesData.data || rolesData.roles || []).map((r: any) => ({
            id: r.id || r.role_id || r.name,
            name: r.name || r.role_name,
            displayName: r.display_name || r.displayName || formatRoleName(r.name || r.role_name),
            description: r.description
          }));
          setRoles(rolesList);
        } else {
          // Fallback: show message that roles couldn't be loaded
          console.warn('Could not fetch assignable roles');
          setRoles([]);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
        // Set empty - user needs proper API access
        setRoles([]);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  // Helper to format role names
  function formatRoleName(name: string): string {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

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
                ) : locations.length === 0 ? (
                  <div className="space-y-2">
                    <select
                      id="officeLocation"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    >
                      <option value="">No locations available</option>
                    </select>
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>No rental premises found.</strong> Office locations are created from RENT type contracts in the{' '}
                        <a href="/admin/contracts" className="underline hover:text-amber-900 dark:hover:text-amber-100">
                          Agreements & Contracts
                        </a>{' '}
                        page. Create a rental premises contract first to add office locations.
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    id="officeLocation"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Office Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.address ? `• ${loc.address}` : ''} ({loc.code})
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
                {loadingData ? (
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
                ) : roles.length === 0 ? (
                  <div className="space-y-2">
                    <select
                      id="role"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    >
                      <option value="">No roles available</option>
                    </select>
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>No roles have been assigned to you.</strong> Your Super Admin has not granted you permission to assign any roles. Please contact your Super Admin to request role assignment permissions.
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.displayName}
                      </option>
                    ))}
                  </select>
                )}
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

