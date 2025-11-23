// Removed 'use client' directive to ensure this is a valid server component.
import { redirect } from 'next/navigation';

export default function ServerLogsPage() {
  // Server-side redirect to the pump-management route.
  redirect('/pump-management/server-logs');
}
