'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
// Inline SVG icon components to avoid importing lucide-react at module scope
function DollarSignIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M12 1v22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendingUpIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M3 17l6-6 4 4 8-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendingDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M21 7l-6 6-4-4-8 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CreditCardIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
      <path d="M2 10h20" strokeWidth="2" />
    </svg>
  );
}

function ReceiptIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M21 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14l3-2 3 2 3-2 3 2 3-2V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalculatorIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="3" y="2" width="18" height="20" rx="2" strokeWidth="2" />
      <path d="M7 7h10" strokeWidth="2" />
      <path d="M7 12h2M11 12h2M15 12h2M7 16h2M11 16h2M15 16h2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChartIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M12 20v-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 20v-10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 20v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17h.01" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FinancePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Role-based access control - allow ADMIN, MANAGER, SUPER_ADMIN
      if (!user.roleName || !['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(user.roleName)) {
        router.push('/auth/login');
        return;
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading finance dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roleName || !['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(user.roleName)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access the finance dashboard.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Sample financial data
  const financialStats = [
    {
      title: 'Total Revenue',
      value: '₹2,45,890',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSignIcon,
      color: 'text-green-600'
    },
    {
      title: 'Total Expenses',
      value: '₹1,89,320',
      change: '+8.2%',
      trend: 'up',
      icon: CreditCardIcon,
      color: 'text-red-600'
    },
    {
      title: 'Net Profit',
      value: '₹56,570',
      change: '+18.3%',
      trend: 'up',
      icon: TrendingUpIcon,
      color: 'text-blue-600'
    },
    {
      title: 'Outstanding',
      value: '₹34,200',
      change: '-5.1%',
      trend: 'down',
      icon: ReceiptIcon,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive financial overview and management
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {financialStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.trend === 'up' ? (
                        <TrendingUpIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDownIcon className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`ml-1 text-sm font-medium ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-50`}>
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Financial Reports */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChartIcon className="h-5 w-5 mr-2 text-blue-600" />
              Financial Reports
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Monthly P&L Statement</span>
                  <span className="text-sm text-gray-500">Generate Report</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Cash Flow Analysis</span>
                  <span className="text-sm text-gray-500">View Details</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Balance Sheet</span>
                  <span className="text-sm text-gray-500">Download PDF</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalculatorIcon className="h-5 w-5 mr-2 text-green-600" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Record Transaction</span>
                  <span className="text-sm text-gray-500">Add New</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Invoice Management</span>
                  <span className="text-sm text-gray-500">View All</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Expense Tracking</span>
                  <span className="text-sm text-gray-500">Manage</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Under Development Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
            <AlertCircleIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">
                Feature Under Development
              </h3>
              <p className="text-yellow-700 mt-1">
                Advanced financial management features are currently being developed. 
                Basic overview and reporting functionality will be available soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}