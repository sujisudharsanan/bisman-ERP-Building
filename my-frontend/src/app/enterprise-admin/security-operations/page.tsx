'use client';

/**
 * 🛡️ Security Operations Dashboard Page
 * BISMAN ERP - Enterprise Admin Security Center
 * 
 * Comprehensive security monitoring page showing:
 * - Security scan results
 * - Service-table usage tracking
 * - Rate limiting stats
 * - Cache health
 * - Cleanup job status
 * - Audit logs
 * - Distributed locks
 */

import React from 'react';
import EnterpriseSecurityDashboard from '@/components/enterprise/EnterpriseSecurityDashboard';

export default function SecurityOperationsPage() {
  return <EnterpriseSecurityDashboard />;
}
