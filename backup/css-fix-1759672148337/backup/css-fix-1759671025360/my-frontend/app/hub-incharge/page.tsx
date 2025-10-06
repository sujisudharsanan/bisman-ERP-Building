"use client"
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import HubInchargeApp from '@/components/hub-incharge/HubInchargeApp'

export default function HubInchargePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Role-based access control - allow STAFF, ADMIN, MANAGER
    if (!user?.roleName || !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)) {
      router.push('/')
      return
    }
  }, [user, isAuthenticated, router])

  if (!isAuthenticated || !user?.roleName || !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Checking access permissions...</p>
        </div>
      </div>
    )
  }

  return <HubInchargeApp />
}
