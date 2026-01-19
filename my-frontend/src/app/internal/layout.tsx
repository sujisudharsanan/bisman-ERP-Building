/**
 * Internal Module Layout
 * Wraps all internal pages with subscription plan gating.
 */

import ModuleGate from '@/components/subscription/ModuleGate';

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate module="internal">
      {children}
    </ModuleGate>
  );
}
