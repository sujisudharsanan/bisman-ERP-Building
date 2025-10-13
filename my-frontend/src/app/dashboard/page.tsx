"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ERP_DashboardLayout from '@/components/layouts/ERP_DashboardLayout'

// Map backend role names to dashboard role keys
const mapRoleNameToDashboardRole = (roleName?: string) => {
  if (!roleName) return 'USER'
  const n = roleName.toUpperCase()
  if (n.includes('SUPER')) return 'SUPER_ADMIN'
  if (n.includes('ADMIN')) return 'ADMIN'
  if (n.includes('MANAGER')) return 'MANAGER'
  if (n.includes('HUB')) return 'HUB_INCHARGE'
  if (n.includes('AUDIT')) return 'AUDITOR'
  if (n.includes('STAFF')) return 'STAFF'
  return 'USER'
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/auth/login')
      return
    }

    const roleKey = mapRoleNameToDashboardRole(user.roleName)
    if (roleKey === 'SUPER_ADMIN') {
      router.push('/super-admin')
      return
    }
    // STAFF users still use hub-incharge route
    if (roleKey === 'STAFF') {
      router.push('/hub-incharge')
      return
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Render the new ERP dashboard layout for all non-superadmin roles
  const roleKey = mapRoleNameToDashboardRole(user.roleName)
  return <ERP_DashboardLayout role={roleKey as any} />
}
