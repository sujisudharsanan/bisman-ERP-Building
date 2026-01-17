'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Mail, CheckCircle, Smartphone, Globe, Server } from 'lucide-react';

export default function StatusSubscribePage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [components, setComponents] = useState({
    all: true,
    api: false,
    web: false,
    database: false,
    payments: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
  };

  if (subscribed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscribed!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            You'll receive status updates at <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Check your inbox to confirm your subscription.
          </p>
          <Link href="/status" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Status Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/status" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Status
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscribe to Updates</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about incidents and maintenance</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Components */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Which components would you like to monitor?
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={components.all}
                    onChange={(e) => setComponents({ ...components, all: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">All Components</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates for all system components</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={components.api}
                    onChange={(e) => setComponents({ ...components, api: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <Server className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">API Services</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Backend API and integrations</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={components.web}
                    onChange={(e) => setComponents({ ...components, web: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <Smartphone className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Web Application</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Frontend web interface</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Bell className="w-4 h-4" />
              Subscribe to Updates
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              You can unsubscribe at any time. View our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            </p>
          </form>

          {/* Alternative */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Prefer RSS? Subscribe via your favorite reader:
            </p>
            <Link href="/status/rss" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View RSS Feed →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
