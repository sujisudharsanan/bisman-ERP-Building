"use client"
import { useState } from 'react'
import axios from '@/lib/api/axios'

export function useAuth() {
  const [user, setUser] = useState(null)

  async function login(values: { username: string; password: string }) {
    const res = await axios.post('/auth/login', values)
    setUser(res.data.user)
    return res
  }

  async function logout() {
    await axios.post('/auth/logout')
    setUser(null)
  }

  return { user, login, logout }
}
