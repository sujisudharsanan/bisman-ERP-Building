'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Briefcase } from 'lucide-react'

export default function ManagerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          role: 'manager' // Specify manager role
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Verify manager role
        if (data.role !== 'manager' && data.role !== 'super_admin' && data.role !== 'admin') {
          setError('Access denied. Manager privileges required.')
          return
        }
        
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify({
            email: data.email,
            role: data.role,
            name: data.name || 'Manager User',
            department: data.department || 'Management'
          }))
        }

        // Redirect to manager dashboard
        router.push('/dashboard')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Manager login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Manager login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail('manager@bisman.com')
    setPassword('Manager@123')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">BISMAN ERP</h1>
          <p className="text-green-200">Manager Portal</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Manager Login</h2>
            <p className="text-sm text-gray-600">Access management dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Manager Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="manager@bisman.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter manager password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Access Manager Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full text-sm text-green-600 hover:text-green-700"
            >
              Use Demo Manager Credentials
            </button>
          </div>

          <div className="mt-4 text-center">
            <a href="/auth/login" className="text-sm text-gray-600 hover:text-gray-800">
              ← Back to General Login
            </a>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-2">Manager Access Includes:</h3>
          <ul className="text-green-200 text-sm space-y-1">
            <li>• Staff Management</li>
            <li>• Sales Reports</li>
            <li>• Inventory Oversight</li>
            <li>• Department Analytics</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
