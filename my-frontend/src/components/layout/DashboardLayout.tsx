"use client"
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">ERP Dashboard</header>
      <main className="p-6">{children}</main>
    </div>
  )
}
