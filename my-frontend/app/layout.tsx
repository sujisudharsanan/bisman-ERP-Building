import '../src/styles/globals.css'
import Providers from '@/providers/Providers'
import LogoutButton from '@/components/ui/LogoutButton'

export const metadata = { title: 'ERP Frontend', description: 'ERP frontend scaffold' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {/* Global logout button for all pages */}
          <LogoutButton position="top-right" variant="danger" />
          {children}
        </Providers>
      </body>
    </html>
  )
}
