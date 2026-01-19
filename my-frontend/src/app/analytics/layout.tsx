/**
 * Analytics Module Layout
 * Wraps all analytics pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="analytics">
      {children}
    </ModuleGate>
  );
}
