/**
 * Governance Module Layout
 * Wraps all governance pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="governance">
      {children}
    </ModuleGate>
  );
}
