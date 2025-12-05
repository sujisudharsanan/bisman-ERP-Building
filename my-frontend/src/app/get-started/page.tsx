'use client';

/**
 * Get Started Page - Redirect to Signup
 */

import { redirect } from 'next/navigation';

export default function GetStartedPage() {
  redirect('/signup');
}
