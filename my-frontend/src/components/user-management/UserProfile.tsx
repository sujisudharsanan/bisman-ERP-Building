'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Calendar, Shield, 
  FileText, Download, Edit3, Save, X, Plus, 
  Trash2, Eye, EyeOff, Key, Settings, Building,
  Crown, Users, UserCheck, AlertTriangle,
  ChevronRight, ChevronDown, ExternalLink
} from 'lucide-react';
import type { 
  User as UserType, 
  UserRole, 
  Permission,
  FileObject,
  KycSubmission,
  UserSession,
  AuditLog
} from '@/types/user-management';

interface UserProfileProps {
  userId: string;
  currentUser?: UserType;
}

interface EditProfileModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (userId: string, data: Partial<UserType>) => Promise<void>;
}

interface PermissionTreeProps {
  permissions: Permission[];
  userPermissions: string[];
  onPermissionChange: (permissionId: string, granted: boolean) => void;
  readonly?: boolean;
}

function EditProfileModal({ user, isOpen, onClose, onUpdate }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    alternate_phone: user.alternate_phone || '',
    designation: user.designation || '',
    department: user.department || '',
    status: user.status,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate(user.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alternate Phone
              </label>
              <input
                type="tel"
                value={formData.alternate_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, alternate_phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionTree({ permissions, userPermissions, onPermissionChange, readonly = false }: PermissionTreeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const module = permission.resource_type || 'General';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const isPermissionGranted = (permissionId: string) => {
    return userPermissions.includes(permissionId);
  };

  return (
    <div className="space-y-2">
      {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
        <div key={module} className="border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleGroup(module)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <Building className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">{module}</span>
              <span className="text-sm text-gray-500">
                ({modulePermissions.filter(p => isPermissionGranted(p.id)).length}/{modulePermissions.length})
              </span>
            </div>
            {expandedGroups.has(module) ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedGroups.has(module) && (
            <div className="px-4 pb-3 border-t border-gray-100">
              <div className="space-y-2 mt-3">
                {modulePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={permission.id}
                      checked={isPermissionGranted(permission.id)}
                      onChange={(e) => !readonly && onPermissionChange(permission.id, e.target.checked)}
                      disabled={readonly}
                      className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={permission.id} 
                        className={`text-sm font-medium ${readonly ? 'text-gray-600' : 'text-gray-900 cursor-pointer'}`}
                      >
                        {permission.name}
                      </label>
                      {permission.description && (
                        <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function UserProfile({ userId, currentUser }: UserProfileProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [kycSubmission, setKycSubmission] = useState<KycSubmission | null>(null);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  const canEdit = currentUser?.id === userId || currentUser?.roles.some(role => 
    ['super_admin', 'admin'].includes(role.name)
  );

  const canViewSensitive = currentUser?.roles.some(role => 
    ['super_admin', 'admin', 'hr'].includes(role.name)
  );

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const userResponse = await fetch(`/api/users/${userId}`);
      const userData = await userResponse.json();
      setUser(userData.user);

      // Fetch KYC submission if exists
      if (userData.user.kyc_submission_id) {
        const kycResponse = await fetch(`/api/kyc/${userData.user.kyc_submission_id}`);
        const kycData = await kycResponse.json();
        setKycSubmission(kycData.submission);
      }

      // Fetch user files
      const filesResponse = await fetch(`/api/users/${userId}/files`);
      const filesData = await filesResponse.json();
      setFiles(filesData.files || []);

      // Fetch active sessions
      const sessionsResponse = await fetch(`/api/users/${userId}/sessions`);
      const sessionsData = await sessionsResponse.json();
      setSessions(sessionsData.sessions || []);

      // Fetch audit logs
      const auditResponse = await fetch(`/api/users/${userId}/audit-logs?limit=50`);
      const auditData = await auditResponse.json();
      setAuditLogs(auditData.logs || []);

      // Fetch permissions if admin
      if (canEdit) {
        const permissionsResponse = await fetch('/api/permissions');
        const permissionsData = await permissionsResponse.json();
        setPermissions(permissionsData.permissions || []);

        const userPermissionsResponse = await fetch(`/api/users/${userId}/permissions`);
        const userPermissionsData = await userPermissionsResponse.json();
        setUserPermissions(userPermissionsData.permissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, data: Partial<UserType>) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchUserData();
    } else {
      throw new Error('Failed to update user');
    }
  };

  const handlePermissionChange = async (permissionId: string, granted: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission_id: permissionId,
          granted,
        }),
      });

      if (response.ok) {
        // Update local state
        if (granted) {
          setUserPermissions(prev => [...prev, permissionId]);
        } else {
          setUserPermissions(prev => prev.filter(id => id !== permissionId));
        }
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSessions(prev => prev.filter(session => session.id !== sessionId));
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  const downloadFile = async (file: FileObject) => {
    try {
      const response = await fetch(`/api/files/${file.file_key}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600">The requested user profile could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                    {user.status.toUpperCase()}
                  </span>
                  {user.roles.map(role => (
                    <span key={role.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex space-x-3">
                {canViewSensitive && (
                  <button
                    onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {showSensitiveInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showSensitiveInfo ? 'Hide' : 'Show'} Sensitive Info</span>
                  </button>
                )}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'kyc', label: 'KYC Details', icon: Shield },
                { id: 'files', label: 'Files', icon: FileText },
                { id: 'permissions', label: 'Permissions', icon: Key },
                { id: 'sessions', label: 'Sessions', icon: Settings },
                { id: 'audit', label: 'Audit Log', icon: Eye },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Basic Information */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-gray-900">{user.first_name} {user.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Alternate Phone</label>
                    <p className="text-gray-900">{user.alternate_phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Designation</label>
                    <p className="text-gray-900">{user.designation || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Department</label>
                    <p className="text-gray-900">{user.department || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Branch</label>
                    <p className="text-gray-900">{user.branch?.name || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Employee ID</label>
                    <p className="text-gray-900">{user.employee_id || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Created</label>
                    <p className="text-gray-900">{formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="text-gray-900">{formatDate(user.updated_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Login</label>
                    <p className="text-gray-900">
                      {user.last_login ? formatDate(user.last_login) : 'Never logged in'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                      {user.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    Send Email
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    Reset Password
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    View Activity Log
                  </button>
                </div>
              </div>

              {/* Roles */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Roles</h3>
                <div className="space-y-2">
                  {user.roles.map(role => (
                    <div key={role.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-900">{role.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">KYC Information</h3>
            {kycSubmission ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(kycSubmission.status)}`}>
                    KYC {kycSubmission.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Submitted {formatDate(kycSubmission.created_at)}
                  </span>
                </div>

                {/* KYC details would be rendered here similar to the KycReviewDrawer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Communication Address</label>
                    <p className="text-gray-900">{kycSubmission.communication_address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <p className="text-gray-900">{kycSubmission.city}</p>
                  </div>
                  {showSensitiveInfo && kycSubmission.aadhaar_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Aadhaar Number</label>
                      <p className="text-gray-900">****-****-{kycSubmission.aadhaar_number.slice(-4)}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No KYC Submission</h4>
                <p className="text-gray-600">This user has not submitted KYC information yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Files</h3>
            {files.length > 0 ? (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.original_name}</p>
                        <p className="text-sm text-gray-500">
                          {file.file_type} • {(file.file_size / 1024 / 1024).toFixed(2)} MB • 
                          Uploaded {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => downloadFile(file)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/api/files/${file.file_key}/view`, '_blank')}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="View file"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Files</h4>
                <p className="text-gray-600">No files have been uploaded for this user.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'permissions' && canEdit && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Permissions</h3>
            <PermissionTree
              permissions={permissions}
              userPermissions={userPermissions}
              onPermissionChange={handlePermissionChange}
              readonly={!canEdit}
            />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Active Sessions</h3>
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.ip_address} • {session.user_agent}
                      </p>
                      <p className="text-sm text-gray-500">
                        Started {formatDate(session.created_at)} • 
                        Last active {formatDate(session.last_activity)}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => terminateSession(session.id)}
                        className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Terminate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h4>
                <p className="text-gray-600">This user has no active sessions.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Audit Log</h3>
            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{log.action}</p>
                        <p className="text-sm text-gray-600">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs</h4>
                <p className="text-gray-600">No audit logs found for this user.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && user && (
        <EditProfileModal
          user={user}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={updateUser}
        />
      )}
    </div>
  );
}

export default UserProfile;
