'use client';

/**
 * Quick Trial Page - Redirects to main signup
 */

import { redirect } from 'next/navigation';

export default function QuickTrialPage() {
  redirect('/signup');
}
