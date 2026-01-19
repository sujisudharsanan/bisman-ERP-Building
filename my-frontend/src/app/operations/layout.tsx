/**
 * Operations Module Layout
 * Wraps all operations pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="operations">
      {children}
    </ModuleGate>
  );
}
