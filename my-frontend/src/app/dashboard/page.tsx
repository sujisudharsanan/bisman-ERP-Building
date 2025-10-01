"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Welcome to ERP Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Database Monitoring Card */}
          <Link 
            href="/dashboard/monitoring"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Database Monitoring</h2>
            </div>
            <p className="text-gray-600">Monitor database performance, query statistics, and health metrics in real-time.</p>
            <div className="mt-4 text-blue-600 font-medium">View Monitoring →</div>
          </Link>

          {/* Users Management Card */}
          <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Users Management</h2>
            </div>
            <p className="text-gray-600">Manage user accounts, roles, and permissions across the system.</p>
            <div className="mt-4 text-gray-400 font-medium">Coming Soon...</div>
          </div>

          {/* Reports Card */}
          <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
            </div>
            <p className="text-gray-600">Generate and view comprehensive business reports and analytics.</p>
            <div className="mt-4 text-gray-400 font-medium">Coming Soon...</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
