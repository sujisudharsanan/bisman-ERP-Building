/**
 * Permission Gate Component
 * Wraps content that requires specific permissions to view
 */

'use client'

import React from 'react'
import { usePermission } from '@/hooks/usePermission'
import { Shield, Lock } from 'lucide-react'

interface PermissionGateProps {
  featureKey: string
  action: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showLoader?: boolean
}

export function PermissionGate({ 
  featureKey, 
  action, 
  children, 
  fallback,
  showLoader = true 
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermission()

  // Show loading state while checking permissions
  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-sm text-gray-600">Checking permissions...</span>
      </div>
    )
  }

  // Check if user has required permission
  const hasAccess = hasPermission(featureKey, action)

  if (!hasAccess) {
    // Return custom fallback or default forbidden message
    return fallback || <DefaultForbidden featureKey={featureKey} action={action} />
  }

  return <>{children}</>
}

// Default forbidden component
function DefaultForbidden({ featureKey, action }: { featureKey: string; action: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <Lock className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
      <p className="text-sm text-gray-600 mb-4">
        You don't have permission to {action} {featureKey}.
      </p>
      <p className="text-xs text-gray-500">
        Contact your administrator to request access.
      </p>
    </div>
  )
}

export default PermissionGate
