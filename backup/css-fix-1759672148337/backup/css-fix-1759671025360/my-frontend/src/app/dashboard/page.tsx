// This page has been moved to /app/dashboard/page.tsx
// Redirecting users to the main dashboard

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard (in the root app folder)
    window.location.href = '/dashboard'
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
