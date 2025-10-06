'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Users,
  Database,
  Activity,
  Settings,
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Server,
  Key,
  Route,
  Grid3X3,
  FileText,
  BarChart3,
  ShoppingCart
} from 'lucide-react'

interface SuperAdminStats {
  users: number
  roles: number
  routes: number
  permissions: number
  activities: number
  tables: number
}

interface ActivityLog {
  id: string
  user_id: number | null
  username: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: any
  created_at: string
}

interface User {
  id: number
  username: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  last_login?: string
}

interface TableData {
  columns: string[]
  rows: any[]
  count: number
}

const SuperAdminControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dashboard Data
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  
  // User Management
  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Table Data Explorer
  const [selectedTable, setSelectedTable] = useState('')
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [tableSearch, setTableSearch] = useState('')

  const availableTables = [
    'users', 'rbac_roles', 'rbac_routes', 'rbac_actions',
    'rbac_permissions', 'rbac_user_roles', 'recent_activity'
  ]

  // API Functions
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`http://localhost:3001/api/v1/super-admin${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Load Dashboard Stats
  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      const [statsRes, activityRes] = await Promise.all([
        apiCall('/dashboard/stats'),
        apiCall('/activity?limit=10')
      ])
      
      setStats(statsRes.data)
      setActivities(activityRes.data)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load Users
  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiCall(`/users?search=${userSearch}&limit=100`)
      setUsers(response.data)
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load Table Data
  const loadTableData = async (tableName: string) => {
    if (!tableName) return
    
    try {
      setLoading(true)
      const response = await apiCall(`/tables/${tableName}?search=${tableSearch}&limit=50`)
      setTableData(response.data)
    } catch (err) {
      setError(`Failed to load ${tableName} data`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Initialize
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardStats()
    } else if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab])

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable)
    }
  }, [selectedTable, tableSearch])

  // Dashboard Tab Component
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats && [
          { label: 'Total Users', value: stats.users, icon: Users, color: 'blue' },
          { label: 'Active Roles', value: stats.roles, icon: Shield, color: 'green' },
          { label: 'Routes', value: stats.routes, icon: Route, color: 'purple' },
          { label: 'Permissions', value: stats.permissions, icon: Key, color: 'orange' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.label}</dt>
                  <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            <Activity className="inline w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {activity.action.includes('create') && <Plus className="w-4 h-4 text-green-500" />}
                    {activity.action.includes('update') && <Edit3 className="w-4 h-4 text-blue-500" />}
                    {activity.action.includes('delete') && <Trash2 className="w-4 h-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.username || 'System'} {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.entity_type} {activity.entity_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(activity.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Users Management Tab
  const UsersTab = () => (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={loadUsers}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.is_active ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-green-600 hover:text-green-900">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Database Explorer Tab
  const DatabaseTab = () => (
    <div className="space-y-6">
      {/* Table Selection */}
      <div className="flex items-center space-x-4">
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a table...</option>
          {availableTables.map(table => (
            <option key={table} value={table}>{table}</option>
          ))}
        </select>
        
        {selectedTable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search in table..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Table Data */}
      {tableData && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedTable} ({tableData.count} records)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tableData.columns.map(column => (
                    <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {tableData.columns.map(column => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof row[column] === 'object' ? 
                          JSON.stringify(row[column]) : 
                          String(row[column] || '')
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'orders', label: 'Order Management', icon: ShoppingCart },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'database', label: 'Database Explorer', icon: Database },
    { id: 'activity', label: 'Activity Log', icon: Activity },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Control Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <Server className="w-4 h-4 mr-1" />
                Database Connected
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'orders' && (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Order Management</h3>
                <p className="text-gray-500 mb-6">Access the comprehensive Super Admin Order Management System</p>
                <a 
                  href="/super-admin/orders"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Open Order Management
                </a>
              </div>
            )}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'database' && <DatabaseTab />}
            {activeTab === 'activity' && (
              <div className="text-center py-12 text-gray-500">
                Activity Log component coming soon...
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="text-center py-12 text-gray-500">
                System Settings component coming soon...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SuperAdminControlPanel
