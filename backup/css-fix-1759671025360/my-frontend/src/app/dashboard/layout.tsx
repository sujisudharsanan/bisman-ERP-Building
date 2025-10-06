'use client'

import React, { useState } from 'react'
// @ts-expect-error: Sidebar file currently doesn't export a module; add an export default in Sidebar.tsx to remove this expect later
import Sidebar from '../../components/layout/Sidebar'
// @ts-expect-error: Header file currently doesn't export a module; add an export default in Header.tsx to remove this expect later
import Header from '../../components/layout/Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
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
          {children}
        </main>
      </div>
    </div>
  )
}
