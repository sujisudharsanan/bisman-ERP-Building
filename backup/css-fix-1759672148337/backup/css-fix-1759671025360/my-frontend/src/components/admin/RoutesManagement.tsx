// Routes Management Component
'use client'
import React, { useState } from 'react'
import { useRoutes } from '../../hooks/useRBAC'
import { Route, Plus, Edit, Trash2, Globe, Lock, Settings } from 'lucide-react'

interface RouteType {
  id: number
  path: string
  name: string
  description?: string
  isProtected: boolean
  module: string
  method: string
  createdAt: string
}

interface RoutesManagementProps {
  searchTerm: string
}

export default function RoutesManagement({ searchTerm }: RoutesManagementProps) {
  const { routes, loading, error, refetch } = useRoutes()

  // Provide local wrappers for create/update/delete so the component can call them;
  // these currently call refetch to refresh the list — replace with real API implementations
  // or update the hook to return these functions if available.
  const createRoute = async (_data: any) => {
    // TODO: call API to create route, e.g. await fetch('/api/routes', { method: 'POST', body: JSON.stringify(_data) })
    if (refetch) await refetch()
  }
  const updateRoute = async (_id: number, _data: any) => {
    // TODO: call API to update route, e.g. await fetch(`/api/routes/${_id}`, { method: 'PUT', body: JSON.stringify(_data) })
    if (refetch) await refetch()
  }
  const deleteRoute = async (_id: number) => {
    // TODO: call API to delete route, e.g. await fetch(`/api/routes/${_id}`, { method: 'DELETE' })
    if (refetch) await refetch()
  }

  const [showModal, setShowModal] = useState(false)
  const [editingRoute, setEditingRoute] = useState<RouteType | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<RouteType | null>(null)

  const filteredRoutes = routes.filter((route: RouteType) =>
    route.path?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.module?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedRoutes = filteredRoutes.reduce((acc: any, route: RouteType) => {
    const module = route.module || 'General'
    if (!acc[module]) {
      acc[module] = []
    }
    acc[module].push(route)
    return acc
  }, {})

  const handleCreateRoute = () => {
    setEditingRoute(null)
    setShowModal(true)
  }

  const handleEditRoute = (route: RouteType) => {
    setEditingRoute(route)
    setShowModal(true)
  }

  const handleDeleteRoute = async (route: RouteType) => {
    try {
      await deleteRoute(route.id)
      setShowDeleteConfirm(null)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const getMethodBadgeColor = (method: string) => {
    const colors = {
      'GET': 'bg-green-100 text-green-800',
      'POST': 'bg-blue-100 text-blue-800',
      'PUT': 'bg-yellow-100 text-yellow-800',
      'DELETE': 'bg-red-100 text-red-800',
      'PATCH': 'bg-purple-100 text-purple-800'
    }
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">System Routes</h3>
          <p className="text-sm text-gray-500">Manage API routes and access controls</p>
        </div>
        <button
          onClick={handleCreateRoute}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Route
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Routes by Module */}
      <div className="space-y-6">
        {Object.entries(groupedRoutes).map(([module, moduleRoutes]: [string, any]) => (
          <div key={module} className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-gray-400" />
                {module} Module
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {moduleRoutes.length} route{moduleRoutes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                {moduleRoutes.map((route: RouteType, index: number) => (
                  <div
                    key={route.id}
                    className={`${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    } px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-blue-50 transition-colors`}
                  >
                    <div className="text-sm font-medium text-gray-900 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Route className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {route.path}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodBadgeColor(route.method)}`}>
                          {route.method}
                        </span>
                        {route.isProtected ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Lock className="h-3 w-3 mr-1" />
                            Protected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
                      <div className="font-medium">{route.name}</div>
                      {route.description && (
                        <div className="text-gray-500 text-xs mt-1">{route.description}</div>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 sm:mt-0 sm:col-span-1 flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditRoute(route)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(route)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRoutes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Route className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No routes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first route'}
          </p>
        </div>
      )}

      {/* Route Modal */}
      {showModal && (
        <RouteModal
          route={editingRoute}
          onClose={() => setShowModal(false)}
          onSave={async (routeData) => {
            if (editingRoute) {
              await updateRoute(editingRoute.id, routeData)
            } else {
              await createRoute(routeData)
            }
            setShowModal(false)
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          route={showDeleteConfirm}
          onConfirm={() => handleDeleteRoute(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  )
}

// Route Modal Component
function RouteModal({
  route,
  onClose,
  onSave
}: {
  route: RouteType | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    path: route?.path || '',
    name: route?.name || '',
    description: route?.description || '',
    method: route?.method || 'GET',
    module: route?.module || '',
    isProtected: route?.isProtected || false
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await onSave(formData)
    } catch (error) {
      // Error is handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {route ? 'Edit Route' : 'Create New Route'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route Path *
                </label>
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/api/users"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTTP Method *
                </label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Get Users"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module
              </label>
              <input
                type="text"
                value={formData.module}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Users, Authentication, Dashboard, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Brief description of what this route does"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isProtected"
                checked={formData.isProtected}
                onChange={(e) => setFormData({ ...formData, isProtected: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isProtected" className="ml-2 block text-sm text-gray-900">
                Requires authentication
              </label>
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
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (route ? 'Updating...' : 'Creating...') : (route ? 'Update Route' : 'Create Route')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  route,
  onConfirm,
  onCancel
}: {
  route: RouteType
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Route</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete the route <strong>{route.path}</strong>? 
            This action cannot be undone and may affect system functionality.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Route
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
