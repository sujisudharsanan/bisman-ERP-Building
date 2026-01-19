/**
 * Reports Module Layout
 * Wraps all reports pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="reports">
      {children}
    </ModuleGate>
  );
}
