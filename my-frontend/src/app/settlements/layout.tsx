/**
 * Settlements Module Layout
 * Wraps all settlements pages with subscription plan gating (finance module).
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function SettlementsLayout({
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
