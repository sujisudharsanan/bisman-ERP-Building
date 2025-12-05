'use client';

/**
 * 🔐 RBAC Security Monitoring Page
 * BISMAN ERP - Enterprise Admin RBAC Security Center
 * 
 * Displays RBAC security metrics and monitoring data:
 * - Privilege escalation attempts
 * - Cross-tenant violations
 * - Permission change activity
 * - Role level distribution
 * - Security alerts status
 * - Audit trail for RBAC changes
 */

import React from 'react';
import RBACSecurityDashboard from '@/components/enterprise/RBACSecurityDashboard';

export default function RBACSecurityPage() {
  return <RBACSecurityDashboard />;
}
