import Link from 'next/link'

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">ERP Frontend Scaffold</h1>
      <p className="mt-4">This is a skeleton Next.js app with MUI, Tailwind, React Query, and auth middleware.</p>
      <p className="mt-4"><Link href="/login">Login</Link></p>
    </main>
  )
}
