"use client";

import { usePathname } from 'next/navigation';
import React from 'react';

// Routes that should skip heavy app providers
const PUBLIC_ROUTES = ['/landing', '/auth', '/login', '/signup', '/onboarding', '/get-started'];

interface ConditionalProvidersProps {
  children: React.ReactNode;
  fullProviders: React.ReactNode;
}

/**
 * Conditionally wraps children with full app providers
 * For public routes (landing, auth, etc.), renders children directly without providers
 * This prevents unnecessary API calls and provider initialization on public pages
 */
export default function ConditionalProviders({ children, fullProviders }: ConditionalProvidersProps) {
  const pathname = usePathname();
  
  // Check if current route is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
  
  if (isPublicRoute) {
    // For public routes, render children without heavy providers
    return <>{children}</>;
  }
  
  // For app routes, use full providers
  return <>{fullProviders}</>;
}
