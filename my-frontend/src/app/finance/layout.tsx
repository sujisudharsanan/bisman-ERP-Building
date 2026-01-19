/**
 * Finance Module Layout
 * Wraps all finance pages with subscription plan gating.
 * 
 * Free plan users attempting to access /finance/* will be
 * redirected to /upgrade-required before seeing any UI.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function FinanceLayout({
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
