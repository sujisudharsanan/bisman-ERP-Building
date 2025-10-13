/**
 * ERP_DashboardLayout - Modern Dark Theme
 * Shared dashboard for all roles except Super Admin
 */

'use client';

import React from 'react';
import { useRoleDashboardData } from '@/hooks/useRoleDashboardData';
import type { ERPDashboardLayoutProps, DashboardModule } from '@/types/dashboard';
import { FaBox, FaUsers, FaChartLine, FaClipboardList, FaCheckCircle, FaWarehouse, FaUserFriends, FaRoute, FaChartBar, FaQrcode, FaUserTie, FaExclamationTriangle, FaFileContract, FaShieldAlt, FaExclamationCircle, FaDollarSign, FaTasks, FaCalendar, FaClock, FaBell, FaUser, FaShoppingCart, FaQuestionCircle, FaEnvelope, FaPlus, FaUserPlus, FaFileAlt, FaCheck, FaClipboardCheck } from 'react-icons/fa';
import { Moon, Sun } from 'lucide-react';

// Icon map for dynamic rendering
const iconMap: Record<string, React.ComponentType<any>> = {
  FaBox: FaBox,
  FaUsers: FaUsers,
  FaChartLine: FaChartLine,
  FaClipboardList: FaClipboardList,
  FaCheckCircle: FaCheckCircle,
  FaWarehouse: FaWarehouse,
  FaUserFriends: FaUserFriends,
  FaRoute: FaRoute,
  FaChartBar: FaChartBar,
  FaQrcode: FaQrcode,
  FaUserTie: FaUserTie,
  FaExclamationTriangle: FaExclamationTriangle,
  FaFileContract: FaFileContract,
  FaShieldAlt: FaShieldAlt,
  FaExclamationCircle: FaExclamationCircle,
  FaDollarSign: FaDollarSign,
  FaTasks: FaTasks,
  FaCalendar: FaCalendar,
  FaClock: FaClock,
  FaBell: FaBell,
  FaUser: FaUser,
  FaShoppingCart: FaShoppingCart,
  FaQuestionCircle: FaQuestionCircle,
  FaEnvelope: FaEnvelope,
  FaPlus: FaPlus,
  FaUserPlus: FaUserPlus,
  FaFileAlt: FaFileAlt,
  FaCheck: FaCheck,
  FaClipboardCheck: FaClipboardCheck,
};

function DashboardBox({ module, onClick, isLoading }: { module: DashboardModule; onClick?: () => void; isLoading?: boolean }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={module.name}
      onClick={onClick}
      className={`group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-lg p-5 flex flex-col justify-between min-h-[140px] transition-all duration-300 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 hover:-translate-y-1 hover:shadow-2xl hover:ring-2 hover:ring-blue-400 ${isLoading ? 'animate-pulse bg-gray-700' : ''}`}
      style={{ border: `2px solid ${module.color || '#6366f1'}` }}
    >
  <div className="flex items-center gap-3 mb-2">
  <span className={`text-2xl ${module.color ? `text-${module.color}-400` : 'text-blue-400'}`}>{React.createElement(iconMap[module.icon] || FaBox)}</span>
        <span className="font-bold text-lg text-white">{module.name}</span>
        {module.badge && <span className="ml-2 px-2 py-0.5 rounded bg-yellow-500 text-xs text-black font-semibold">{module.badge}</span>}
      </div>
      <div className="text-sm text-gray-300 mb-2">{module.description}</div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-2xl font-bold text-white">{module.value}</span>
        <a href={module.link} className="ml-2 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 transition">Go to Page</a>
      </div>
    </div>
  );
}

export default function ERP_DashboardLayout({ role }: ERPDashboardLayoutProps) {
  const { data, loading, error } = useRoleDashboardData(role);

  if (error) return <div className="p-8 text-red-500">Error loading dashboard: {error}</div>;
  if (loading || !data) {
    // Skeleton loaders
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="h-8 w-1/3 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-1/4 bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <DashboardBox key={i} module={{ id: `skeleton-${i}`, name: '', description: '', value: '', icon: 'FaBox', link: '#', color: 'blue' }} isLoading />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Summary metrics row
  const summaryTiles = Object.entries(data.summary).map(([key, value]) => (
    <div key={key} className="flex flex-col items-center justify-center bg-gray-800 rounded-xl p-4 shadow text-white min-w-[100px]">
      <span className="text-xs uppercase text-gray-400">{key}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  ));

  // Notification banner
  const alert = data.alerts && data.alerts[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Greeting and quick actions */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{role} Dashboard</h1>
            <p className="text-gray-300">Welcome, <span className="font-semibold">{role}</span>! {data.summary.completed} tasks completed.</p>
          </div>
          <div className="flex gap-2">
            {data.quickActions?.map(action => (
              <a key={action.id} href={typeof action.action === 'string' ? action.action : '#'} className={`px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition flex items-center gap-2`}>
                {React.createElement(iconMap[action.icon] || FaPlus)} {action.label}
              </a>
            ))}
          </div>
        </div>

        {/* Notification banner */}
        {alert && (
          <div className={`mb-6 p-4 rounded-xl shadow bg-yellow-700 text-white flex items-center justify-between`}>
            <div>
              <span className="font-bold mr-2">{alert.title}</span>
              <span>{alert.message}</span>
            </div>
            {alert.actionLabel && alert.actionLink && (
              <a href={alert.actionLink} className="ml-4 px-3 py-1 rounded bg-white text-yellow-700 font-semibold shadow hover:bg-yellow-200 transition">{alert.actionLabel}</a>
            )}
          </div>
        )}

        {/* Summary metrics */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryTiles}
        </div>

        {/* Dashboard boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.modules.map(module => (
            <DashboardBox key={module.id} module={module} />
          ))}
        </div>

        {/* Recent activity feed */}
        {data.recentActivities && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {data.recentActivities.slice(0, 5).map(activity => (
                <div key={activity.id} className={`flex items-center gap-3 p-3 rounded-xl bg-gray-800 shadow text-white`}>
                  <span className="text-lg">{React.createElement(iconMap[activity.icon || 'FaCheck'] || FaCheck)}</span>
                  <div>
                    <div className="font-semibold">{activity.title}</div>
                    <div className="text-sm text-gray-400">{activity.description}</div>
                  </div>
                  <span className="ml-auto text-xs text-gray-500">{typeof activity.timestamp === 'string' ? activity.timestamp.slice(0, 16).replace('T', ' ') : activity.timestamp.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
