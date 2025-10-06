"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/ui/LogoutButton'
import HubInchargeAccessLink from '@/components/ui/HubInchargeAccessLink'
import GridDashboard from '@/components/dashboard/GridDashboard'
import api from '@/lib/api/axios'

export default function DashboardPage(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [authError, setAuthError] = useState(false)
  const [useGridLayout, setUseGridLayout] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log('Dashboard: Fetching user profile...')
        const response = await api.get('/api/me')
        
        if (response.data && response.data.user) {
          const userData = response.data.user
          console.log('Dashboard: User data received:', userData)
          
          // If user is STAFF, redirect to hub-incharge
          if (userData.roleName === 'STAFF') {
            console.log('Dashboard: STAFF user detected, redirecting to hub-incharge')
            router.push('/hub-incharge')
            return
          }
          
          // For ADMIN/MANAGER users, set user data and show dashboard
          setUser(userData)
          setAuthError(false)
        } else {
          console.log('Dashboard: No user data in response')
          setAuthError(true)
        }
      } catch (error) {
        console.error('Dashboard: Authentication error:', error)
        setAuthError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [router])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show auth error state
  if (authError || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access the dashboard.</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard - {user?.roleName || 'User'}
              </h1>
              <p className="text-gray-600">Welcome back, {user?.username || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setUseGridLayout(!useGridLayout)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  useGridLayout 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {useGridLayout ? '📊 Grid View' : '🔲 Grid View'}
              </button>
              <HubInchargeAccessLink />
              <LogoutButton position="inline" variant="danger" />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      {useGridLayout ? (
        <GridDashboard user={user} />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* API Requests Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">API Requests</h3>
              <div className="text-3xl font-bold text-blue-600">1,234</div>
              <p className="text-gray-600">Requests this hour</p>
            </div>

            {/* Database Health Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Database Health</h3>
              <div className="text-3xl font-bold text-green-600">99.9%</div>
              <p className="text-gray-600">Uptime</p>
            </div>

            {/* Active Users Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Active Users</h3>
              <div className="text-3xl font-bold text-purple-600">56</div>
              <p className="text-gray-600">Currently online</p>
            </div>

            {/* Response Time Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Response Time</h3>
              <div className="text-3xl font-bold text-orange-600">45ms</div>
              <p className="text-gray-600">Average response</p>
            </div>

            {/* Error Rate Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Error Rate</h3>
              <div className="text-3xl font-bold text-red-600">0.1%</div>
              <p className="text-gray-600">Last 24 hours</p>
            </div>

            {/* Storage Usage Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Storage Usage</h3>
              <div className="text-3xl font-bold text-indigo-600">78%</div>
              <p className="text-gray-600">Database storage</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">User logged in - 2 minutes ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Database backup completed - 5 minutes ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600">System maintenance scheduled - 10 minutes ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
