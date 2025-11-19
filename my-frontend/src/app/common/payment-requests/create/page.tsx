/**
 * Payment Requests Page
 * Main page for creating and managing payment requests
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyCreateRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Redirect old route to new unified payment request page
    router.replace('/common/payment-request');
  }, [router]);
  return null;
}
