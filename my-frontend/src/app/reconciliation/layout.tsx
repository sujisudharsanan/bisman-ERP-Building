/**
 * Reconciliation Module Layout
 * Wraps all reconciliation pages with subscription plan gating (finance module).
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function ReconciliationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="finance">
      {children}
    </ModuleGate>
  );
}
