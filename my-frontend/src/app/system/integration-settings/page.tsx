'use client';

import React from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { IntegrationsPage } from '@/components/integrations';

export default function IntegrationSettingsPage() {
  return (
    <SuperAdminShell title="Integration Settings">
      <IntegrationsPage />
    </SuperAdminShell>
  );
}

