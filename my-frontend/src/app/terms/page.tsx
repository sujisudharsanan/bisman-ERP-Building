'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Scale, AlertCircle } from 'lucide-react';

export default function TermsOfServicePage() {
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
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: {lastUpdated}</p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-600" />
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                By accessing and using BISMAN ERP ("the Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by these terms, please do not use 
                this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                2. Use License
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Permission is granted to temporarily use the Service for personal, non-commercial transitory 
                viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose</li>
                <li>Attempt to decompile or reverse engineer any software</li>
                <li>Remove any copyright or proprietary notations</li>
                <li>Transfer the materials to another person</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Account Terms</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                You must be 18 years or older to use this Service. You must provide your legal full name, 
                valid email address, and any other information requested. You are responsible for maintaining 
                the security of your account and password.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Payment Terms</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                A valid payment method is required for paying accounts. The Service is billed in advance on a 
                monthly or yearly basis and is non-refundable. All fees are exclusive of taxes, which you are 
                responsible for paying.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                5. Disclaimer
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                The materials on BISMAN ERP are provided on an 'as is' basis. BISMAN makes no warranties, 
                expressed or implied, and hereby disclaims and negates all other warranties including, without 
                limitation, implied warranties or conditions of merchantability, fitness for a particular 
                purpose, or non-infringement of intellectual property.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Limitations</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                In no event shall BISMAN or its suppliers be liable for any damages arising out of the use or 
                inability to use the materials on BISMAN ERP, even if BISMAN has been notified of the 
                possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">7. Governing Law</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                These terms and conditions are governed by and construed in accordance with the laws of India 
                and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">8. Contact Information</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                <strong>Email:</strong> legal@bisman.in<br />
                <strong>Address:</strong> BISMAN Technologies, Chennai, India
              </p>
            </section>
          </div>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
              Privacy Policy
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
