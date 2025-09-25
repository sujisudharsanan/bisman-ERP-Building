import type { Metadata } from 'next'
import { ReactQueryProvider } from '@/lib/query-provider'
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
