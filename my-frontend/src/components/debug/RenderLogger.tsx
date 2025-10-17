'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function RenderLogger() {
  const pathname = usePathname();

  useEffect(() => {
    console.log('🎬 App Render Cycle:', {
      pathname,
      timestamp: new Date().toISOString(),
      windowExists: typeof window !== 'undefined'
    });
  }, [pathname]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('❌ Global Error Caught:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('❌ Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    console.log('✅ Global error listeners attached');

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
