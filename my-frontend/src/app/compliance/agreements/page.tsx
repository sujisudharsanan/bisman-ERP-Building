"use client";
import AgreementsLegalPage from '@/pages/legal/agreements';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

export default function AgreementsAppPage() {
  return (
    <SuperAdminShell title="Agreements & Contracts">
      <AgreementsLegalPage />
    </SuperAdminShell>
  );
}
