/**
 * Compliance Module Layout
 * Wraps all compliance pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="compliance">
      {children}
    </ModuleGate>
  );
}
