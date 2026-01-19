/**
 * HR Module Layout
 * Wraps all HR pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="hr">
      {children}
    </ModuleGate>
  );
}
