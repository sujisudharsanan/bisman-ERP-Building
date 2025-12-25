"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/common/hooks/useAuth";
import { useRouter } from 'next/navigation';
import { getIcon } from "@/components/layout/BaseSidebar";
import { getRoleDisplayName } from '@/utils/roleDisplay';
import {
  Settings,
  Bell,
  Globe,
  Moon,
  Sun,
  Monitor,
  User as UserIcon,
  Upload,
  Trash2,
  Key,
  HelpCircle,
  Shield,
  UserPlus,
  Users,
  Lock,
  Smartphone,
  Eye,
  Edit2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Search,
  X,
  Check,
} from "lucide-react";
import { uploadFiles } from "@/lib/attachments";
import ThemeSelector from "@/components/ThemeSelector";

type Msg = { type: "success" | "error"; text: string } | null;

export default function UserSettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  // Left-nav tabs
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "security" | "users" | "help">(
    "profile"
  );

  // Check if user has admin permissions
  const isAdmin = useMemo(() => {
    const role = (user as any)?.role || (user as any)?.roleName || '';
    return ['SUPER_ADMIN', 'ADMIN', 'ENTERPRISE_ADMIN', 'HR', 'HR_MANAGER', 'SYSTEM_ADMIN'].includes(role);
  }, [user]);

  // Check if user is super admin (can assign any role)
  const isSuperAdmin = useMemo(() => {
    const role = (user as any)?.role || (user as any)?.roleName || '';
    return ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(role);
  }, [user]);

  // Roles that only super admins can assign
  const SUPER_ADMIN_ONLY_ROLES = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER ADMIN', 'ENTERPRISE ADMIN'];

  // Profile state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // User Management state
  interface ManagedUser {
    id: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at?: string;
    firstName?: string;
    lastName?: string;
    reporting_authority_id?: string;
    branch_id?: string;
  }
  interface AvailableRole {
    id: string;
    name: string;
  }
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');
  
  // Edit User Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserData, setEditUserData] = useState<{
    id: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    reporting_authority_id?: string;
    branch_id?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Available users for reporting authority dropdown
  const [availableManagers, setAvailableManagers] = useState<{ id: string; name: string; role: string }[]>([]);
  // Available branches
  const [availableBranches, setAvailableBranches] = useState<{ id: string; name: string }[]>([]);

  // Fetch users list (include inactive for admin management)
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(usersSearchQuery)}&limit=100&include_inactive=true`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch available roles
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        let roles = data.roles || data || [];
        
        // Filter out super admin roles for non-super-admin users
        if (!isSuperAdmin) {
          roles = roles.filter((r: any) => {
            const roleName = (r.name || '').toUpperCase().replace(/\s+/g, '_');
            return !SUPER_ADMIN_ONLY_ROLES.includes(roleName) && 
                   !SUPER_ADMIN_ONLY_ROLES.includes(r.name);
          });
        }
        
        setAvailableRoles(roles.map((r: any) => ({ id: String(r.id || r.name), name: r.name })));
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };
  
  // Fetch available managers (for reporting authority dropdown)
  const fetchManagers = async () => {
    try {
      const res = await fetch('/api/users/search?limit=100&include_self=true', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const users = data.users || data || [];
        setAvailableManagers(users.map((u: any) => ({ 
          id: u.id, 
          name: u.fullName || u.username || u.email,
          role: u.role || u.roleName || ''
        })));
      }
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };
  
  // Fetch available branches (with fallback to office locations from contracts)
  const fetchBranches = async () => {
    try {
      // First try to fetch from branches endpoint
      const res = await fetch('/api/branches', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const branches = data.branches || data.data || data || [];
        if (branches.length > 0) {
          setAvailableBranches(branches.map((b: any) => ({ 
            id: String(b.id), 
            name: b.name || b.branchName || b.branch_name 
          })));
          return;
        }
      }
      
      // Fallback: fetch office locations from RENT contracts (same as user creation page)
      const locRes = await fetch('/api/admin/contracts?contract_type=RENT', { credentials: 'include' });
      if (locRes.ok) {
        const locData = await locRes.json();
        const allContracts = locData.data?.contracts || locData.contracts || [];
        // Filter to only ACTIVE or DRAFT status
        const contracts = allContracts.filter((c: any) => 
          c.status === 'ACTIVE' || c.status === 'DRAFT'
        );
        if (contracts.length > 0) {
          setAvailableBranches(contracts.map((c: any) => ({ 
            id: String(c.id), 
            name: c.party_name || c.title || c.rent_details?.property_address || 'Unknown Location'
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // Load users when tab changes to users
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
      fetchRoles();
      fetchManagers();
      fetchBranches();
    }
  }, [activeTab, isAdmin, isSuperAdmin]);

  // Handle role update
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Role updated successfully' });
        setEditingUserId(null);
        fetchUsers();
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Failed to update role' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update role' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle user disable/enable toggle
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: currentStatus ? 'User disabled' : 'User enabled' });
        fetchUsers();
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Failed to update status' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update status' });
    } finally {
      setActionLoading(null);
    }
  };

  // Open edit modal for a user
  const handleOpenEditModal = (user: ManagedUser) => {
    console.log('[EditUser] Opening modal for user:', user);
    console.log('[EditUser] User reporting_authority_id:', user.reporting_authority_id, typeof user.reporting_authority_id);
    console.log('[EditUser] User branch_id:', user.branch_id, typeof user.branch_id);
    setEditUserData({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      reporting_authority_id: user.reporting_authority_id ? String(user.reporting_authority_id) : '',
      branch_id: user.branch_id ? String(user.branch_id) : '',
    });
    setShowEditModal(true);
  };

  // Save user edits
  const handleSaveUserEdit = async () => {
    if (!editUserData) return;
    
    setActionLoading(editUserData.id);
    try {
      console.log('[EditUser] Saving user:', editUserData.id, {
        role: editUserData.role,
        reporting_authority_id: editUserData.reporting_authority_id,
        branch_id: editUserData.branch_id,
      });
      
      const res = await fetch(`/api/system/users/${editUserData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: editUserData.role,
          reporting_authority_id: editUserData.reporting_authority_id || null,
          branch_id: editUserData.branch_id || null,
        }),
      });
      
      console.log('[EditUser] Response status:', res.status);
      const responseData = await res.json();
      console.log('[EditUser] Response data:', responseData);
      
      if (res.ok && responseData.success) {
        setMessage({ type: 'success', text: 'User updated successfully' });
        setShowEditModal(false);
        setEditUserData(null);
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: responseData.error || responseData.message || 'Failed to update user' });
      }
    } catch (err) {
      console.error('[EditUser] Error:', err);
      setMessage({ type: 'error', text: 'Failed to update user' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (userId: string, email: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/auth/admin-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, email }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password reset link sent to user email' });
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Failed to send reset link' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send reset link' });
    } finally {
      setActionLoading(null);
    }
  };

  // Preferences state
  const [settings, setSettings] = useState({
    theme: "system",
    language: "en",
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const displayInitial = useMemo(() => {
    const base = String(
      (user as any)?.name || (user as any)?.fullName || (user as any)?.username || "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();
    return base || "U";
  }, [user]);

  // Load profile picture from server
  const loadProfilePicture = async () => {
    try {
      const response = await fetch("/api/upload/profile-pic", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Loaded profile picture:', result); // Debug log
        
        if (result.success && result.profile_pic_url) {
          // Convert to secure URL format
          const secureUrl = result.profile_pic_url.replace('/uploads/', '/api/secure-files/');
          console.log('Setting avatar preview to:', secureUrl); // Debug log
          setAvatarPreview(secureUrl);
        } else {
          console.log('No profile picture URL in response'); // Debug log
          setAvatarPreview(null);
        }
      } else {
        console.log('Response not OK:', response.status); // Debug log
      }
    } catch (error) {
      // Could not load profile picture - continue without it
      console.error('Failed to load profile picture:', error);
    }
  };

  // Load existing profile picture on mount
  useEffect(() => {
    loadProfilePicture();
  }, []);

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } else {
      setAvatarPreview(null);
    }
  };

  // Upload avatar immediately when selected
  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('profile_pic', file);

      console.log('Starting upload...'); // Debug log

      // Simulate progress (since fetch doesn't support upload progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const uploadRes = await fetch("/api/upload/profile-pic", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(95);

      console.log('Upload response status:', uploadRes.status); // Debug log

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        console.error('Upload error:', errorData); // Debug log
        throw new Error(errorData.message || 'Photo upload failed');
      }

      const uploadResult = await uploadRes.json();
      console.log('Upload result:', uploadResult); // Debug log
      
      setUploadProgress(100);
      
      // Clear the file state
      setAvatarFile(null);
      
      // Reload the profile picture from server to get the persisted URL
      await loadProfilePicture();
      
      // Refresh the auth context so the new photo appears everywhere
      if (refreshUser) {
        await refreshUser();
        console.log('Auth context refreshed - new photo will appear in navbar/sidebar'); // Debug log
      }
      
      setMessage({ type: "success", text: "Profile picture uploaded successfully!" });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Upload failed";
      console.error('Upload error:', e); // Debug log
      setMessage({ type: "error", text: errorMsg });
      // Revert to previous state on error
      setAvatarPreview(null);
      setAvatarFile(null);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const removeAvatar = async () => {
    try {
      await fetch("/api/user/profile/avatar", { method: "DELETE", credentials: "include" });
      // Clear local state
      setAvatarFile(null);
      setAvatarPreview(null);
      setMessage({ type: "success", text: "Profile picture removed" });
    } catch {
      setMessage({ type: "error", text: "Remove failed" });
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      setMessage({ type: res.ok ? "success" : "error", text: res.ok ? "Saved" : "Save failed" });
    } catch {
      setMessage({ type: "error", text: "Request failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs at Top */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "profile"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "preferences"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => setActiveTab("preferences")}
            >
              <Settings className="w-4 h-4" />
              <span>Additional Settings</span>
            </button>
            <button
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "security"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => setActiveTab("security")}
            >
              <Shield className="w-4 h-4" />
              <span>Trust & Security</span>
            </button>
            {isAdmin && (
              <button
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "users"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                onClick={() => setActiveTab("users")}
              >
                <UserPlus className="w-4 h-4" />
                <span>User Management</span>
              </button>
            )}
            <button
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "help"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => setActiveTab("help")}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help & Support</span>
            </button>
          </nav>
        </div>

        {/* Messages */}
        {message && (
          <div className="p-4">
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
              }`}
            >
              {message.text}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Profile Summary with Avatar */}
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden text-gray-700 dark:text-gray-300 text-4xl">
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{displayInitial}</span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <label className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'} text-white transition-colors`} title={uploading ? 'Uploading...' : 'Upload Photo'}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          className="hidden"
                          disabled={uploading}
                          onChange={async (e) => {
                            const f = e.target.files?.[0] || null;
                            if (f) {
                              // Validate file type
                              const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                              if (!validTypes.includes(f.type)) {
                                setMessage({ type: "error", text: "Please upload a valid image file (JPEG, PNG, GIF, WebP)" });
                                return;
                              }
                              // Validate file size (max 2MB)
                              if (f.size > 2 * 1024 * 1024) {
                                setMessage({ type: "error", text: "File size must be less than 2MB" });
                                return;
                              }
                              // Show preview immediately
                              handleAvatarChange(f);
                              // Upload immediately
                              await uploadAvatar(f);
                            }
                            // Clear the input so the same file can be selected again
                            e.target.value = '';
                          }}
                        />
                      </label>
                      
                      {/* Progress bar */}
                      {uploading && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-2 transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                      
                      {avatarPreview && !uploading && (
                        <button
                          onClick={removeAvatar}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-xs"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {(user as any)?.name || (user as any)?.fullName || user?.email || 'User'}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {getRoleDisplayName((user as any)?.roleName || (user as any)?.role)}
                    </p>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Forgot Password</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    If you've forgotten your password, please contact your administrator or use the password reset link sent to your email.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/auth/forgot-password", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ email: user?.email }),
                          });
                          setMessage({ 
                            type: res.ok ? "success" : "error", 
                            text: res.ok ? "Password reset link sent to your email" : "Failed to send reset link" 
                          });
                        } catch {
                          setMessage({ type: "error", text: "Request failed" });
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      <Key className="w-4 h-4" />
                      <span>Send Reset Link</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="space-y-6">
                {/* Color Theme Selector */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Color Theme</h2>
                  <ThemeSelector variant="grid" />
                </div>

                {/* Appearance */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Display Mode</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: "light", label: "Light", icon: 'Sun' },
                      { value: "dark", label: "Dark", icon: 'Moon' },
                      { value: "system", label: "System", icon: 'Monitor' },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSettings({ ...settings, theme: value })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                          settings.theme === value
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {(() => {
                          const IconComp = getIcon(Icon);
                          return (
                            <IconComp
                              className={`w-6 h-6 mb-2 ${
                                settings.theme === value
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            />
                          );
                        })()}
                        <span
                          className={`text-sm font-medium ${
                            settings.theme === value
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notifications</h2>
                  <div className="space-y-4">
                    {[
                      { key: "emailNotifications", label: "Email notifications", desc: "Receive updates via email" },
                      { key: "pushNotifications", label: "Push notifications", desc: "Enable browser notifications" },
                      { key: "weeklyDigest", label: "Weekly summary", desc: "Get a weekly overview" },
                    ].map(({ key, label, desc }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800 last:border-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
                        </div>
                        <button
                          onClick={() =>
                            setSettings({
                              ...settings,
                              [key]: !settings[key as keyof typeof settings],
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings[key as keyof typeof settings]
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings[key as keyof typeof settings]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Language & Region */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Language & Region</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                      <select
                        value={settings.language}
                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date format</label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time format</label>
                      <select
                        value={settings.timeFormat}
                        onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="12h">12-hour</option>
                        <option value="24h">24-hour</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save Preferences"}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Security Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Trust & Security
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage your account security, privacy settings, and trusted devices
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password & Authentication */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    Password & Authentication
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">Change Password</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Update your account password</div>
                      </div>
                      <button
                        onClick={() => router.push('/settings/security')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors"
                      >
                        Update
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</div>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    Active Sessions & Devices
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    View and manage your logged-in devices and sessions.
                  </p>
                  <button
                    onClick={() => router.push('/settings/sessions')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Smartphone className="w-4 h-4" />
                    Manage Sessions
                  </button>
                </div>

                {/* Privacy Settings */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-600" />
                    Privacy Settings
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Control your data visibility and privacy preferences.
                  </p>
                  <button
                    onClick={() => router.push('/settings/privacy')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Privacy Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === "users" && isAdmin && (
              <div className="space-y-6">
                {/* User Management Overview */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        User Management
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Create and manage user accounts for your organization
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Create New User */}
                  <button
                    onClick={() => router.push('/hr/user-creation')}
                    className="flex items-start gap-4 p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Create New User</h3>
                      <p className="text-sm text-blue-100">
                        Register a new user with complete profile and access settings
                      </p>
                    </div>
                  </button>

                  {/* Manage All Users */}
                  <button
                    onClick={() => router.push('/super-admin/system/user-management')}
                    className="flex items-start gap-4 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1 text-gray-900 dark:text-gray-100">Manage All Users</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        View, edit, and manage all user accounts
                      </p>
                    </div>
                  </button>
                </div>

                {/* Users List with Actions */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        All Users
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={usersSearchQuery}
                            onChange={(e) => setUsersSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={fetchUsers}
                          disabled={usersLoading}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {usersLoading ? (
                    <div className="p-8 text-center">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
                    </div>
                  ) : usersList.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No users found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {usersList.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {(u.username || u.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                      {u.username || 'No username'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {editingUserId === u.id ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={editingRole}
                                      onChange={(e) => setEditingRole(e.target.value)}
                                      className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    >
                                      {availableRoles.map((r) => (
                                        <option key={r.id} value={r.name}>{r.name}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleRoleUpdate(u.id, editingRole)}
                                      disabled={actionLoading === u.id}
                                      className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                      title="Save"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingUserId(null)}
                                      className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    {u.role || 'No Role'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  u.is_active 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                }`}>
                                  {u.is_active ? 'Active' : 'Disabled'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Edit User - Opens Modal */}
                                  <button
                                    onClick={() => handleOpenEditModal(u)}
                                    disabled={actionLoading === u.id}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Edit User"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  {/* Toggle Active Status */}
                                  <button
                                    onClick={() => handleToggleActive(u.id, u.is_active)}
                                    disabled={actionLoading === u.id}
                                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                      u.is_active
                                        ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                    }`}
                                    title={u.is_active ? 'Disable User' : 'Enable User'}
                                  >
                                    {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                  </button>

                                  {/* Password Reset */}
                                  <button
                                    onClick={() => handlePasswordReset(u.id, u.email)}
                                    disabled={actionLoading === u.id}
                                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Reset Password"
                                  >
                                    <Key className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Additional User Management Links */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    More Options
                  </h3>
                  <div className="space-y-3">
                    <a
                      href="/system/permission-manager"
                      className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">Permission Manager</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Manage user permissions and access</div>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                    <a
                      href="/system/roles-users-report"
                      className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">Roles & Users Report</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">View all roles and assigned users</div>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "help" && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <HelpCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Need Help?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Get support for any issues or questions you have about the BISMAN ERP system.
                  </p>
                  <button
                    onClick={() => router.push('/common/help-support')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-medium transition-colors"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>Go to Help & Support Center</span>
                  </button>
                </div>

                {/* Quick Links */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Quick Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                      href="/common/help-support"
                      className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Create Ticket
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Submit a support ticket for technical issues
                        </p>
                      </div>
                    </a>
                    <a
                      href="/common/help-support"
                      className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          My Tickets
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          View and track your support requests
                        </p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editUserData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Username - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editUserData.username}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Email - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editUserData.email}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Role</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Reporting Authority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reporting Authority
                </label>
                <select
                  value={editUserData.reporting_authority_id || ''}
                  onChange={(e) => setEditUserData({ ...editUserData, reporting_authority_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Reporting Authority</option>
                  {availableManagers
                    .filter(m => m.id !== editUserData.id) // Exclude the user being edited
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.role ? `(${m.role})` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The manager/supervisor this user reports to
                </p>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch
                </label>
                <select
                  value={editUserData.branch_id || ''}
                  onChange={(e) => setEditUserData({ ...editUserData, branch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  editUserData.is_active 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}>
                  {editUserData.is_active ? 'Active' : 'Disabled'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use the toggle button in the users list to change status
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserEdit}
                disabled={actionLoading === editUserData.id || !editUserData.role}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === editUserData.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
