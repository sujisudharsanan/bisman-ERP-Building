'use client'

import React from 'react'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useActionChecker } from '@/hooks/useActionChecker'
import { FEATURE_KEYS, ACTIONS } from '@/config/permissions'

/**
 * Dashboard Widget Component
 * Reusable widget container with consistent styling
 */
interface DashboardWidgetProps {
  id: string
  title: string
  children: React.ReactNode
}

function DashboardWidget({ id, title, children }: DashboardWidgetProps) {
  return (
    <div 
      key={id}
      className="bg-gray-700 p-5 rounded-xl shadow-xl border-l-4 border-yellow-500 flex flex-col"
    >
      <h3 className="text-yellow-500 font-semibold text-lg mb-3">{title}</h3>
      <div className="flex-1 flex flex-col justify-center">
        {children}
      </div>
    </div>
  )
}

/**
 * Mock React Grid Layout Wrapper
 * Simulates React Grid Layout with Tailwind CSS grid
 */
interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

interface MockRGLWrapperProps {
  layout: LayoutItem[]
  children: React.ReactNode[]
}

function MockRGLWrapper({ layout, children }: MockRGLWrapperProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const layoutItem = layout[index]
          return (
            <div key={layoutItem?.i || index} className="min-h-[200px]">
              {child}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

/**
 * SuperAdmin Dashboard Page
 * Comprehensive dashboard with RBAC integration
 */
export default function SuperAdminDashboard() {
  const { getUserCapabilities, hasSuperAdminAccess } = useActionChecker()
  const capabilities = getUserCapabilities()

  // Layout configuration for dashboard widgets
  const layout = [
    { i: 'a', x: 0, y: 0, w: 1, h: 1 },
    { i: 'b', x: 1, y: 0, w: 1, h: 1 },
    { i: 'c', x: 2, y: 0, w: 1, h: 1 },
    { i: 'd', x: 0, y: 1, w: 1, h: 1 },
    { i: 'e', x: 1, y: 1, w: 1, h: 1 },
    { i: 'f', x: 2, y: 1, w: 1, h: 1 },
  ]

  // Show access denied if not super admin
  if (!hasSuperAdminAccess()) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-600 text-white p-8 rounded-xl shadow-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have Super Admin privileges to access this dashboard.</p>
          <p className="mt-2 text-sm opacity-90">Current Role: {capabilities.role || 'Unknown'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-8">
          <h1 className="text-3xl font-extrabold text-yellow-500 mb-2">
            Welcome, Super Admin Role
          </h1>
          <p className="text-gray-400 text-lg">
            Review your current ERP metrics and access control summary.
          </p>
          <div className="mt-4 flex items-center space-x-4 text-sm">
            <span className="bg-yellow-500 text-gray-900 px-3 py-1 rounded-full font-semibold">
              {capabilities.role}
            </span>
            <span className="text-green-400">● System Status: Online</span>
            <span className="text-blue-400">● Database: Connected</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <MockRGLWrapper layout={layout}>
          {/* Widget A: Total Users */}
          <DashboardWidget id="a" title="Total Users">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">256</div>
              <div className="text-gray-400 text-sm">Active Users</div>
              <div className="mt-2 text-green-400 text-xs">+12 this month</div>
            </div>
          </DashboardWidget>

          {/* Widget B: Open Tickets */}
          <DashboardWidget id="b" title="Open Tickets">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">42</div>
              <div className="text-gray-400 text-sm">Pending Support</div>
              <div className="mt-2 text-orange-400 text-xs">3 high priority</div>
            </div>
          </DashboardWidget>

          {/* Widget C: Sales Target */}
          <DashboardWidget id="c" title="Sales Target">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">92%</div>
              <div className="text-gray-400 text-sm">Monthly Goal</div>
              <div className="mt-2">
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </DashboardWidget>

          {/* Widget D: Create New Report */}
          <DashboardWidget id="d" title="Create New Report">
            <div className="text-center">
              <PermissionGate 
                featureKey={FEATURE_KEYS.REPORTS} 
                action={ACTIONS.CREATE}
                fallback={<span className="text-red-400 font-semibold">Access Denied</span>}
              >
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 w-full">
                  + Generate Report
                </button>
                <div className="mt-2 text-gray-400 text-xs">Full reporting access</div>
              </PermissionGate>
            </div>
          </DashboardWidget>

          {/* Widget E: Critical Status */}
          <DashboardWidget id="e" title="Critical Status">
            <div className="text-center">
              <div className="text-red-400 font-bold text-lg mb-2">⚠ System Alert</div>
              <div className="text-gray-400 text-sm mb-3">Database backup pending</div>
              <button className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm transition-colors duration-200">
                View Details
              </button>
            </div>
          </DashboardWidget>

          {/* Widget F: Quick Settings Access */}
          <DashboardWidget id="f" title="Quick Settings Access">
            <div className="text-center">
              <PermissionGate 
                featureKey={FEATURE_KEYS.SETTINGS} 
                action={ACTIONS.UPDATE}
                fallback={<span className="text-red-400 font-semibold">View Only</span>}
              >
                <button className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 py-2 px-4 rounded-lg font-semibold transition-colors duration-200 w-full">
                  ⚙ Edit Config
                </button>
                <div className="mt-2 text-gray-400 text-xs">System configuration</div>
              </PermissionGate>
            </div>
          </DashboardWidget>
        </MockRGLWrapper>

        {/* Additional Super Admin Controls */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PermissionGate 
            featureKey={FEATURE_KEYS.USERS} 
            action={ACTIONS.MANAGE}
            fallback={null}
          >
            <div className="bg-blue-600 p-4 rounded-lg text-center">
              <h3 className="font-semibold mb-2">User Management</h3>
              <button className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold">
                Manage Users
              </button>
            </div>
          </PermissionGate>

          <PermissionGate 
            featureKey={FEATURE_KEYS.ROLES} 
            action={ACTIONS.MANAGE}
            fallback={null}
          >
            <div className="bg-purple-600 p-4 rounded-lg text-center">
              <h3 className="font-semibold mb-2">Role Management</h3>
              <button className="bg-white text-purple-600 px-3 py-1 rounded text-sm font-semibold">
                Manage Roles
              </button>
            </div>
          </PermissionGate>

          <PermissionGate 
            featureKey={FEATURE_KEYS.FINANCE} 
            action={ACTIONS.READ}
            fallback={null}
          >
            <div className="bg-green-600 p-4 rounded-lg text-center">
              <h3 className="font-semibold mb-2">Financial Overview</h3>
              <button className="bg-white text-green-600 px-3 py-1 rounded text-sm font-semibold">
                View Finances
              </button>
            </div>
          </PermissionGate>

          <PermissionGate 
            featureKey={FEATURE_KEYS.INVENTORY} 
            action={ACTIONS.READ}
            fallback={null}
          >
            <div className="bg-orange-600 p-4 rounded-lg text-center">
              <h3 className="font-semibold mb-2">Inventory Status</h3>
              <button className="bg-white text-orange-600 px-3 py-1 rounded text-sm font-semibold">
                View Inventory
              </button>
            </div>
          </PermissionGate>
        </div>

        {/* Permission Demonstration Section */}
        <div className="mt-8 bg-gray-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold text-yellow-500 mb-4">Permission Demonstration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white">Permitted Actions</h3>
              <div className="space-y-2">
                <PermissionGate 
                  featureKey={FEATURE_KEYS.DASHBOARD} 
                  action={ACTIONS.READ}
                  fallback={null}
                >
                  <div className="flex items-center text-green-400">
                    <span className="mr-2">✓</span>
                    <span>Dashboard Access</span>
                  </div>
                </PermissionGate>
                
                <PermissionGate 
                  featureKey={FEATURE_KEYS.USERS} 
                  action={ACTIONS.CREATE}
                  fallback={null}
                >
                  <div className="flex items-center text-green-400">
                    <span className="mr-2">✓</span>
                    <span>Create Users</span>
                  </div>
                </PermissionGate>
                
                <PermissionGate 
                  featureKey={FEATURE_KEYS.FINANCE} 
                  action={ACTIONS.READ}
                  fallback={null}
                >
                  <div className="flex items-center text-green-400">
                    <span className="mr-2">✓</span>
                    <span>Financial Reports</span>
                  </div>
                </PermissionGate>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white">Role Information</h3>
              <div className="space-y-2 text-gray-300">
                <div>Role: <span className="text-yellow-400 font-semibold">{capabilities.role}</span></div>
                <div>Admin Access: <span className="text-green-400">{capabilities.isAdmin ? 'Yes' : 'No'}</span></div>
                <div>Super Admin: <span className="text-green-400">{capabilities.isSuperAdmin ? 'Yes' : 'No'}</span></div>
                <div>Permission Level: <span className="text-blue-400">Full System Access</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
