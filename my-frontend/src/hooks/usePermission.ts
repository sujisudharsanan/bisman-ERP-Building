/**
 * Permission Hook
 * Provides access to user permissions and permission checking functions
 */

'use client'

import { useContext } from 'react'
import { PermissionContext } from '@/contexts/PermissionContext'

export function usePermission() {
  const context = useContext(PermissionContext)
  
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider')
  }

  return context
}

export default usePermission
