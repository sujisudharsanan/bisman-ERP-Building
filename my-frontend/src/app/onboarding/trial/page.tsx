'use client';

/**
 * Trial Onboarding Page - Redirects to main signup
 */

import { redirect } from 'next/navigation';

export default function TrialOnboardingPage() {
  redirect('/signup');
}
