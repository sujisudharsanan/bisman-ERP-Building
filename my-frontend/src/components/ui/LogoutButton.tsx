"use client"

import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuth'

interface LogoutButtonProps {
  className?: string
  variant?: 'default' | 'minimal' | 'danger'
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'inline'
  hideOnLogin?: boolean
}

export default function LogoutButton({ 
  className = '', 
  variant = 'default',
  position = 'inline',
  hideOnLogin = true
}: LogoutButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const logout = useAuthStore(state => state.logout)
  const user = useAuthStore(state => state.user)

  // Hide on login page if hideOnLogin is true
  if (hideOnLogin && pathname === '/login') {
    return null
  }

  // Only show if user is authenticated (optional)
  // if (!user) return null

  const handleLogout = async () => {
    try {
      await logout()
      // Clear any local storage flags
      localStorage.removeItem('justLoggedIn')
      // Redirect to login page
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails, redirect to login
      router.push('/login')
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return 'text-gray-600 hover:text-gray-800 text-sm underline'
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm'
      default:
        return 'bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md font-medium text-sm'
    }
  }

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50'
      case 'top-left':
        return 'fixed top-4 left-4 z-50'
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50'
      default:
        return ''
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={`${getVariantStyles()} ${getPositionStyles()} ${className} transition-colors duration-200`}
      aria-label="Logout"
      title="Logout from the application"
    >
      {variant === 'minimal' ? 'Logout' : '🚪 Logout'}
    </button>
  )
}
