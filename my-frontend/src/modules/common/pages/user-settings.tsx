"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/common/hooks/useAuth";
import { useRouter } from 'next/navigation';
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
} from "lucide-react";
import { uploadFiles } from "@/lib/attachments";

type Msg = { type: "success" | "error"; text: string } | null;

export default function UserSettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  // Left-nav tabs
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "help">(
    "profile"
  );

  // Profile state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
                      {(user as any)?.roleName || (user as any)?.role || 'User'}
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
                {/* Appearance */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
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
                        <Icon
                          className={`w-6 h-6 mb-2 ${
                            settings.theme === value
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        />
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
    </div>
  );
}
