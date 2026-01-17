'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Database, Bell, Globe, UserCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 15, 2026';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: {lastUpdated}</p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section>
              <p className="text-gray-600 dark:text-gray-300">
                BISMAN Technologies ("we", "us", or "our") operates the BISMAN ERP platform. This page informs 
                you of our policies regarding the collection, use, and disclosure of personal data when you 
                use our Service and the choices you have associated with that data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Information Collection
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                We collect several types of information for various purposes to provide and improve our Service:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                <li><strong>Personal Data:</strong> Name, email address, phone number, company information</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent, features used, browser type</li>
                <li><strong>Business Data:</strong> Financial records, transactions, inventory data you input</li>
                <li><strong>Cookies:</strong> Session identifiers, preferences, authentication tokens</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Use of Data
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                BISMAN ERP uses the collected data for various purposes:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                <li>To provide and maintain our Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To provide customer support</li>
                <li>To gather analysis to improve our Service</li>
                <li>To monitor the usage of our Service</li>
                <li>To detect, prevent and address technical issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                Data Security
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                The security of your data is important to us. We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                <li>End-to-end encryption for all data transmission (TLS 1.3)</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Multi-factor authentication options</li>
                <li>Role-based access control (RBAC)</li>
                <li>Complete audit trail of all data access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-600" />
                Data Transfer
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Your information may be transferred to and maintained on servers located outside of your state, 
                province, country or other governmental jurisdiction. We will take all steps reasonably necessary 
                to ensure that your data is treated securely and in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                Your Rights
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (right to be forgotten)</li>
                <li>Object to processing of your data</li>
                <li>Request data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-600" />
                Changes to This Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                We may update our Privacy Policy from time to time. We will notify you of any changes by 
                posting the new Privacy Policy on this page and updating the "last updated" date. You are 
                advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                <strong>Email:</strong> privacy@bisman.in<br />
                <strong>Data Protection Officer:</strong> dpo@bisman.in<br />
                <strong>Address:</strong> BISMAN Technologies, Chennai, India
              </p>
            </section>
          </div>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
              Terms of Service
            </Link>
            <Link href="/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
              Sign Up
            </Link>
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
              Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
