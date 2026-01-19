/**
 * Procurement Module Layout
 * Wraps all procurement pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function ProcurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="procurement">
      {children}
    </ModuleGate>
  );
}
