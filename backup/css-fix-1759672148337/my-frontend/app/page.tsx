import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

export default function Page() {
  return (
    <main className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">ERP Frontend Scaffold</h1>
          <p className="mt-4">This is a skeleton Next.js app with MUI, Tailwind, React Query, and auth middleware.</p>
        </div>
        <LogoutButton variant="danger" />
      </div>
      
      <div className="space-y-4">
        <p><Link href="/login" className="text-blue-600 hover:underline">Login</Link></p>
        <p><Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link></p>
        <p><Link href="/debug-auth" className="text-blue-600 hover:underline">Debug Auth</Link></p>
      </div>
    </main>
  )
}
