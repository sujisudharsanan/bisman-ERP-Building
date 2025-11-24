'use client';

/**
 * System Health Dashboard Page
 * Located at: /enterprise-admin/monitoring/system-health
 * 
 * This is a wrapper page for the SystemHealthDashboard component
 * that integrates with the Enterprise Admin layout.
 * Includes error boundary for production resilience.
 */

import React from 'react';
import SystemHealthDashboard from '@/pages/SystemHealthDashboard';
import SystemHealthErrorBoundary from '@/components/SystemHealthErrorBoundary';

export default function SystemHealthPage() {
  return (
    <SystemHealthErrorBoundary>
      <SystemHealthDashboard />
    </SystemHealthErrorBoundary>
  );
}
