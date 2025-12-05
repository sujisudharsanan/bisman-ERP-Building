'use client';

/**
 * Enterprise Admin - Live Monitoring Page
 * Located at: /enterprise-admin/monitoring/live
 * 
 * Real-time system monitoring with:
 * - Database health
 * - API metrics
 * - Per-tenant usage
 * - System resources
 */

import React from 'react';
import LiveMonitoringDashboard from '@/components/enterprise/LiveMonitoringDashboard';

export default function LiveMonitoringPage() {
  return <LiveMonitoringDashboard />;
}
