'use client';

/**
 * Resume Trial Page - Redirects to main signup
 * Draft functionality is now handled in main signup page
 */

import { redirect } from 'next/navigation';

export default function TrialResumeTokenPage() {
  redirect('/signup');
}
