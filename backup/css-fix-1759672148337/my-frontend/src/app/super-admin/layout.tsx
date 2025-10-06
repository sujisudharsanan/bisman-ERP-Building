'use client'

import React, { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

interface SuperAdminLayoutProps {
  children: React.ReactNode
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-950">
          {/* Super Admin Badge */}
          <div className="mb-4">
            <div className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
              ⚡ Super Administrator Panel
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
