import type { Metadata } from 'next'
/* Minimal ReactQueryProvider stub to avoid missing-module error.
   Replace this with your real provider implementation from '@/lib/query-provider'
   or restore that file in src/lib/query-provider.tsx when available. */
function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
import { ThemeRegistry } from '@/lib/theme'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'ERP System',
  description: 'Enterprise Resource Planning frontend with Next.js',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ReactQueryProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
