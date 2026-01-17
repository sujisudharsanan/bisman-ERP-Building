'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Clock, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

export default function SLADocumentPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/admin/sla" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to SLA Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Level Agreement (SLA)</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Version 2.0 | Effective: January 1, 2026</p>
            </div>
          </div>

          {/* SLA Content */}
          <div className="prose dark:prose-invert max-w-none space-y-8">
            {/* Service Availability */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                1. Service Availability
              </h2>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mt-4">
                <p className="text-lg font-bold text-green-700 dark:text-green-400">99.9% Uptime Guarantee</p>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  Measured monthly, excluding scheduled maintenance windows
                </p>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                BISMAN ERP guarantees 99.9% uptime for all production services. This equates to a maximum 
                of 43 minutes of unplanned downtime per month.
              </p>
            </section>

            {/* Response Times */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                2. Support Response Times
              </h2>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Response Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resolution Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">P1 - Critical</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">System down, no workaround</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">15 minutes</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">4 hours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs font-medium">P2 - High</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Major feature impacted</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">1 hour</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">8 hours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">P3 - Medium</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Minor feature impacted</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">4 hours</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">24 hours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded text-xs font-medium">P4 - Low</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Questions, enhancements</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">24 hours</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Best effort</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Service Credits */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                3. Service Credits
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                If we fail to meet our uptime commitment, you may be eligible for service credits:
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">99.0% - 99.9%:</span> 10% credit of monthly fees
                </li>
                <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">95.0% - 99.0%:</span> 25% credit of monthly fees
                </li>
                <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Below 95.0%:</span> 50% credit of monthly fees
                </li>
              </ul>
            </section>

            {/* Exclusions */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                4. Exclusions
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                The following are not covered under this SLA:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Scheduled maintenance (announced 48 hours in advance)</li>
                <li>Force majeure events</li>
                <li>Issues caused by customer's systems or third-party services</li>
                <li>Beta or trial features</li>
                <li>Abuse or misuse of the service</li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                5. Support Channels
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                To report issues or request support:
              </p>
              <ul className="mt-4 space-y-2 text-gray-600 dark:text-gray-300">
                <li><strong>Email:</strong> support@bisman.in</li>
                <li><strong>Phone (P1 only):</strong> +91 44 1234 5678</li>
                <li><strong>Status Page:</strong> status.bisman.in</li>
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <Link href="/support" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
              Contact Support
            </Link>
            <Link href="/status" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
              System Status
            </Link>
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
