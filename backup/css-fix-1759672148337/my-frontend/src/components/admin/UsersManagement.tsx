// Users Management Component
'use client'
import React, { useState } from 'react'
import { useUsers, useRoles } from '../../hooks/useRBAC'
import { User, Mail, Calendar, Shield, Edit, MoreVertical } from 'lucide-react'

interface User {
  id: number
  username: string
  email: string
  role: string
  roleName: string
  createdAt: string
  roles: Array<{ id: number; name: string }>
}

interface UsersManagementProps {
  searchTerm: string
}

export default function UsersManagement({ searchTerm }: UsersManagementProps) {
  const { users, loading, error, assignRole } = useUsers()
  const { roles } = useRoles()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  const filteredUsers = users.filter((user: User) =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssignRole = async (userId: number, roleId: number) => {
    try {
      await assignRole(userId, roleId)
      setShowRoleModal(false)
      setSelectedUser(null)
    } catch (error) {
      // Error handling is managed by the hook
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'STAFF': 'bg-green-100 text-green-800',
      'USER': 'bg-gray-100 text-gray-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">System Users</h3>
        <p className="text-sm text-gray-500">Manage user accounts and role assignments</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredUsers.map((user: User) => (
            <li key={user.id}>
              <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.username || 'Unknown User'}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        Joined {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedUser(user)
                      setShowRoleModal(true)
                    }}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Change Role
                  </button>
                  <button className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Empty State */}
        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No users are registered in the system'}
            </p>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <RoleAssignmentModal
          user={selectedUser}
          roles={roles}
          onClose={() => {
            setShowRoleModal(false)
            setSelectedUser(null)
          }}
          onAssign={handleAssignRole}
        />
      )}
    </div>
  )
}

// Role Assignment Modal
function RoleAssignmentModal({
  user,
  roles,
  onClose,
  onAssign
}: {
  user: User
  roles: any[]
  onClose: () => void
  onAssign: (userId: number, roleId: number) => Promise<void>
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Find current role ID
  const currentRole = roles.find(role => role.name === user.role)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoleId) return

    try {
      setSubmitting(true)
      await onAssign(user.id, selectedRoleId)
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Assign Role to {user.username}
          </h3>
          
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Current Role:</strong> {user.role}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Email:</strong> {user.email}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Role
              </label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.id}
                      checked={selectedRoleId === role.id}
                      onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{role.name}</span>
                        {currentRole?.id === role.id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Current
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedRoleId || selectedRoleId === currentRole?.id}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
