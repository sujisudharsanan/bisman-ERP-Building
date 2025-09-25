"use client"
import Link from 'next/link'

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r h-screen p-4">
      <nav className="space-y-2">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/dashboard/hr">HR</Link>
        <Link href="/dashboard/finance">Finance</Link>
      </nav>
    </aside>
  )
}
