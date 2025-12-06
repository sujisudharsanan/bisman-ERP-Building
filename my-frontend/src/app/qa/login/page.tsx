'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TesterCredential {
  email: string;
  password: string;
  role: string;
}

export default function QATesterLoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<TesterCredential[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);

  // Fetch available tester credentials on mount
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const res = await fetch('/api/qa/tester-credentials');
        if (res.ok) {
          const data = await res.json();
          setCredentials(data.credentials || []);
        }
      } catch (err) {
        console.log('Could not fetch credentials', err);
      }
    };
    fetchCredentials();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/qa/tester-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Redirect to QA dashboard
      router.push('/qa');
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const fillCredentials = (cred: TesterCredential) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setShowCredentials(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-3xl font-bold text-white">QA Testing Portal</h1>
          <p className="text-purple-200 mt-2">
            Independent access for testers
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="qa_tester@bisman.local"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white
                ${loading
                  ? 'bg-purple-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
                } transition-colors`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In to QA Portal'
              )}
            </button>
          </form>

          {/* Quick Fill Credentials */}
          {credentials.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center justify-center gap-2"
              >
                {showCredentials ? '▼ Hide' : '▶ Show'} Available Test Accounts
              </button>

              {showCredentials && (
                <div className="mt-4 space-y-2">
                  {credentials.map((cred, idx) => (
                    <button
                      key={idx}
                      onClick={() => fillCredentials(cred)}
                      className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {cred.role}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {cred.email}
                          </p>
                        </div>
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          Use →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Links */}
        <div className="text-center mt-6 space-y-2">
          <Link
            href="/login"
            className="text-purple-200 hover:text-white text-sm hover:underline"
          >
            ← Back to Main Login
          </Link>
          <p className="text-purple-300/60 text-xs">
            This portal works independently of the main ERP system
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-white/10 rounded-xl p-4 text-center">
          <p className="text-purple-200 text-sm">
            <strong className="text-white">💡 Note:</strong> QA Tester accounts have hardcoded credentials 
            that work even when the main ERP database is down.
          </p>
        </div>
      </div>
    </div>
  );
}
