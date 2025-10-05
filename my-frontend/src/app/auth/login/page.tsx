'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Shield, Briefcase, Fuel } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1 for email, 2 for password
  const router = useRouter()

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setStep(2)
    }
  }

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
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify({
            email: data.email,
            role: data.role
          }))
        }

        // Redirect based on role
        if (data.role === 'super_admin') {
          router.push('/super-admin')
        } else {
          router.push('/dashboard')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    setStep(1)
    setPassword('')
    setError('')
  }

  const fillDemoCredentials = () => {
    setEmail('suji@gmail.com')
    setPassword('Password@123')
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-orange-400 rounded-full mx-auto mb-4"></div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {step === 1 ? (
            // Email Step
            <div>
              <h1 className="text-2xl font-light text-gray-900 mb-2">Sign in</h1>
              <p className="text-sm text-gray-600 mb-6">Use your account</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email or phone"
                    className="w-full px-3 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-base"
                    required
                  />
                  {!email && (
                    <p className="text-red-500 text-sm mt-1">Enter an email or phone number</p>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={fillDemoCredentials}
                    className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
                  >
                    Use demo login
                  </button>
                  
                  <div className="text-sm text-gray-600">
                    <p>Not your computer? Use Private Browsing windows to sign in.</p>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Learn more about using Guest mode
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Create account
                  </button>
                  <button
                    type="submit"
                    disabled={!email}
                    className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Next
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Password Step
            <div>
              <div className="flex items-center mb-4">
                <button
                  onClick={goBack}
                  className="mr-3 p-1 hover:bg-gray-100 rounded"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">{email}</div>
                </div>
              </div>

              <h1 className="text-2xl font-light text-gray-900 mb-6">Enter password</h1>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-3 pr-10 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="text-sm">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading || !password}
                    className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : null}
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Demo Credentials Info */}
        {step === 1 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials:</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Super Admin:</strong></p>
              <p>Email: suji@gmail.com</p>
              <p>Password: Password@123</p>
            </div>
          </div>
        )}

        {/* Role-Specific Login Links */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Role-Specific Login</h3>
          <div className="grid grid-cols-1 gap-3">
            <a
              href="/auth/admin-login"
              className="flex items-center justify-center px-4 py-3 border border-blue-300 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Shield className="w-5 h-5 mr-2" />
              Admin Portal
            </a>
            <a
              href="/auth/manager-login"
              className="flex items-center justify-center px-4 py-3 border border-green-300 rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              Manager Portal
            </a>
            <a
              href="/auth/hub-incharge-login"
              className="flex items-center justify-center px-4 py-3 border border-orange-300 rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <Fuel className="w-5 h-5 mr-2" />
              Hub Incharge Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
