"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuth'
import LogoutButton from '@/components/ui/LogoutButton'

export default function DebugAuth() {
  const [authStatus, setAuthStatus] = useState('checking...')
  const [cookieInfo, setCookieInfo] = useState('')
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    // Check authentication status
    fetch('/api/auth-test', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setAuthStatus(JSON.stringify(data, null, 2))
      })
      .catch(err => {
        setAuthStatus(`Error: ${err.message}`)
      })

    // Check cookies
    setCookieInfo(document.cookie || 'No cookies found')
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Authentication Debug</h1>
        <LogoutButton variant="danger" />
      </div>
      
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Auth Store User</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">API Auth Test</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {authStatus}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Browser Cookies</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {cookieInfo}
          </pre>
        </div>

        <div className="space-x-4">
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
