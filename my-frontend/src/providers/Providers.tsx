"use client"
import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '@/lib/mui/theme'
import { NotificationsProvider } from './notifications/NotificationsProvider'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationsProvider>{children}</NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
