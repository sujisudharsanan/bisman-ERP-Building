"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/common/hooks/useAuth";
import {
  Settings,
  Save,
  Bell,
  Globe,
  Moon,
  Sun,
  Monitor,
  User as UserIcon,
  Upload,
  Trash2,
  Key,
} from "lucide-react";
import { uploadFiles } from "@/lib/attachments";

// Simple password strength component (localized to this file to avoid extra imports)
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s; // 0-5
  })();
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const pct = (score / 5) * 100;
  const color = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-blue-500','bg-green-600'][Math.max(0, score-1)] || 'bg-gray-400';
  return (
    <div className="mt-1">
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded">
        <div className={`h-1 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">{labels[Math.max(0, score-1)]}</p>
    </div>
  );
};

type Msg = { type: "success" | "error"; text: string } | null;

export default function UserSettingsPage() {
  const { user } = useAuth();

  // Left-nav tabs
  const [activeTab, setActiveTab] = useState<"profile" | "preferences">(
    "profile"
  );

  // Profile state
  const [name, setName] = useState(
    String((user as any)?.name || (user as any)?.fullName || "")
  );
  const [email, setEmail] = useState(String((user as any)?.email || ""));
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const displayInitial = useMemo(() => {
    const base = String(
      (user as any)?.name || (user as any)?.fullName || (user as any)?.username || "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();
    return base || "U";
  }, [user]);

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } else {
      setAvatarPreview(null);
    }
  };

  // Handlers
  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Send JSON for simple fields
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email }),
      });

      // Upload avatar if present (dev stub)
      if (avatarFile) {
        await uploadFiles([avatarFile], 'avatar', String((user as any)?.id || 'me'));
      }

      setMessage({ type: res.ok ? "success" : "error", text: res.ok ? "Saved" : "Save failed" });
    } catch (e) {
      setMessage({ type: "error", text: "Request failed" });
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = async () => {
    handleAvatarChange(null);
    try {
      await fetch("/api/user/profile/avatar", { method: "DELETE", credentials: "include" });
      setMessage({ type: "success", text: "Removed" });
    } catch {
      setMessage({ type: "error", text: "Remove failed" });
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage({ type: res.ok ? "success" : "error", text: res.ok ? "Updated" : "Update failed" });
      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ type: "error", text: "Request failed" });
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: in-page sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-2">
              <nav className="flex lg:flex-col gap-2">
                <button
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    activeTab === "profile"
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => setActiveTab("profile")}
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="truncate">Profile</span>
                </button>
                <button
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    activeTab === "preferences"
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => setActiveTab("preferences")}
                >
                  <Settings className="w-4 h-4" />
                  <span className="truncate">Additional Settings</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Right: main content */}
          <section className="lg:col-span-8 xl:col-span-9">
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Profile card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile</h2>
                  <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden text-gray-700 dark:text-gray-300 text-2xl">
                        {avatarPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{displayInitial}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              if (f) handleAvatarChange(f);
                            }}
                          />
                        </label>
                        <button
                          onClick={removeAvatar}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                    {/* Fields */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? "Saving..." : "Save"}</span>
                    </button>
                  </div>
                </div>

                {/* Change password */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="••••••••"
                      />
                      {newPassword && (
                        <PasswordStrength password={newPassword} />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={changePassword}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                    >
                      <Key className="w-4 h-4" />
                      <span>{saving ? "Updating..." : "Update Password"}</span>
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
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {message && (
              <div
                className={`mt-6 p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                    : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                }`}
              >
                {message.text}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
