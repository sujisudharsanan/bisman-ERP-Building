'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Rss, Bell, Mail, CheckCircle, Copy } from 'lucide-react';

export default function StatusRSSPage() {
  const [copied, setCopied] = useState(false);
  const rssUrl = 'https://status.bisman.in/feed.rss';

  const handleCopy = () => {
    navigator.clipboard.writeText(rssUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Rss className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RSS Feed</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Subscribe to status updates via RSS</p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Get real-time updates about system status, incidents, and maintenance through your favorite RSS reader.
          </p>

          {/* RSS URL */}
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RSS Feed URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={rssUrl}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Popular Readers */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Popular RSS Readers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <a href="https://feedly.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">F</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Feedly</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Web & Mobile</p>
              </div>
            </a>
            <a href="https://www.inoreader.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold">I</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Inoreader</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Web & Mobile</p>
              </div>
            </a>
          </div>

          {/* Other Options */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Other Notification Options</h3>
            <div className="flex flex-wrap gap-4">
              <Link href="/status/subscribe" className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4" />
                Email Notifications
              </Link>
              <Link href="/status" className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Bell className="w-4 h-4" />
                View Status Page
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
