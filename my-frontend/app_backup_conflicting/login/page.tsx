'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuth';

type Toast = { title: string; message: string; type?: 'success' | 'error' };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const validateEmail = (v: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v);
  const validatePassword = (v: string) => v.length >= 6;

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'error' = 'success'
  ) => {
    setToast({ title, message, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  };

  const handleDemo = (role: string) => {
    const demo = {
      admin: { email: 'admin@business.com', password: 'admin123' },
      manager: { email: 'manager@business.com', password: 'manager123' },
      staff: { email: 'staff@business.com', password: 'staff123' },
    } as Record<string, { email: string; password: string }>;

    const creds = demo[role];
    if (!creds) return;
    setEmail(creds.email);
    setPassword(creds.password);
    setEmailError('');
    setPasswordError('');
    showToast(
      'Demo Credentials Loaded',
      `You can now sign in as ${role}`,
      'success'
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');

    let valid = true;
    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    if (!valid) {
      showToast(
        'Validation Error',
        'Please fix the errors in the form',
        'error'
      );
      return;
    }

    setLoading(true);
    try {
      // call the auth store login method (assumed to return a promise)
      const login = useAuthStore.getState().login;
      await login(email, password);
      showToast('Login Successful', 'Welcome back!', 'success');

      // Set a simple flag in localStorage to help with the transition
      localStorage.setItem('justLoggedIn', 'true');

      // Wait a bit longer for the auth state to be set and then redirect
      setTimeout(() => {
        // Force a hard navigation to ensure auth state is respected
        window.location.href = '/dashboard';
      }, 1200);
    } catch (err: any) {
      showToast('Login Failed', err?.message ?? 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = () => {
    const el = document.getElementById('password') as HTMLInputElement | null;
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
    // toggle icons by class
    const eye = document.getElementById('eye-icon');
    const eyeSlash = document.getElementById('eye-slash-icon');
    if (eye && eyeSlash) {
      eye.classList.toggle('hidden');
      eyeSlash.classList.toggle('hidden');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="login-card bg-white p-6 sm:p-8 rounded-2xl shadow-lg w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
        <div className="text-center">
          <div className="icon-container mx-auto bg-yellow-400 rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-md" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-4">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-gray-600">Use your account</p>
        </div>

        <form
          id="loginForm"
          className="mt-6 sm:mt-8 space-y-4 sm:space-y-6"
          onSubmit={onSubmit}
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg placeholder-gray-400 focus:ring-0 focus:border-gray-300 text-sm sm:text-base bg-gray-50"
                placeholder="admin_test@example.com"
              />
            </div>
            <p
              id="email-error"
              className={`mt-1 text-sm text-red-600 ${emailError ? '' : 'hidden'}`}
            >
              {emailError}
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 border border-gray-200 rounded-lg placeholder-gray-400 focus:ring-0 focus:border-gray-300 text-sm sm:text-base bg-gray-50"
                placeholder="********"
              />
              <button
                type="button"
                id="togglePassword"
                onClick={togglePassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg
                  id="eye-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <svg
                  id="eye-slash-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 hidden"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                    clipRule="evenodd"
                  />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              </button>
            </div>
            <p
              id="password-error"
              className={`mt-1 text-sm text-red-600 ${passwordError ? '' : 'hidden'}`}
            >
              {passwordError}
            </p>
          </div>

          <div className="text-right text-sm">
            <a href="#" className="font-medium text-yellow-500 hover:underline">
              Forgot password?
            </a>
          </div>

          <div>
            <button
              type="submit"
              id="submit-btn"
              className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm font-semibold rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black shadow-md transition-colors"
              disabled={loading}
            >
              <span id="btn-text" className="text-black">
                {loading ? 'Signing in...' : 'Sign in'}
              </span>
              <svg
                id="spinner"
                className={`spinner h-4 w-4 sm:h-5 sm:w-5 text-gray-900 ml-2 ${loading ? '' : 'hidden'}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </button>
          </div>

          <div className="mt-4 sm:mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Demo Access</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                data-role="admin"
                onClick={() => handleDemo('admin')}
                className="demo-btn inline-flex justify-center py-2 px-3 sm:px-4 border border-gray-200 rounded-md shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                Admin
              </button>
              <button
                type="button"
                data-role="manager"
                onClick={() => handleDemo('manager')}
                className="demo-btn inline-flex justify-center py-2 px-3 sm:px-4 border border-gray-200 rounded-md shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                Manager
              </button>
              <button
                type="button"
                data-role="staff"
                onClick={() => handleDemo('staff')}
                className="demo-btn inline-flex justify-center py-2 px-3 sm:px-4 border border-gray-200 rounded-md shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                Staff
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              Don't have an account?{' '}
              <a
                href="#"
                className="font-medium text-yellow-500 hover:underline ml-1"
              >
                Register here
              </a>
            </p>
          </div>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <div
          id="toast"
          className="fixed top-4 right-4 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto"
        >
          <div className="rounded-lg shadow-xs overflow-hidden">
            <div className="p-4">
              <div className="flex items-start">
                <div id="toast-icon" className="flex-shrink-0">
                  {toast.type === 'success' ? (
                    <svg
                      className="h-6 w-6 text-green-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-6 w-6 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p
                    id="toast-title"
                    className="text-sm font-medium text-gray-900"
                  >
                    {toast.title}
                  </p>
                  <p id="toast-message" className="mt-1 text-sm text-gray-500">
                    {toast.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => setToast(null)}
                    id="toast-close"
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div
              id="toast-progress"
              className="h-1 bg-gray-200"
              style={{ width: '100%', transition: 'width 5s linear' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
