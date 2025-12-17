'use client';

/**
 * Support Playbooks Route
 * Path: /internal/playbooks
 * 
 * Access: BISMAN Staff Roles + ENTERPRISE_ADMIN
 */

import SupportPlaybooksPage from '@/modules/internal/pages/support-playbooks';

export default function PlaybooksRoute() {
  return <SupportPlaybooksPage />;
}
