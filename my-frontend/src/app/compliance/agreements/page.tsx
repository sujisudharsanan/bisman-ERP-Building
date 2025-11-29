"use client";
import AgreementsLegalPage from '@/app/legal/agreements/page';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

export default function AgreementsAppPage() {
  return (
    <SuperAdminShell title="Agreements & Contracts">
      <AgreementsLegalPage />
    </SuperAdminShell>
  );
}
