"use client"
import React, { useEffect } from 'react'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  useEffect(() => {
    // ensure csrf cookie is present
    fetch('/api/auth/csrf', { credentials: 'include' }).catch(() => {})
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <LoginForm />
    </main>
  )
}
