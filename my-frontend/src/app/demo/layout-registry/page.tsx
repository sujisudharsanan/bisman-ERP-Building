'use client';

import { LayoutProvider } from '@/contexts/LayoutProvider';
import LayoutRegistryDemo from '@/components/LayoutRegistryDemo';

export default function LayoutDemoPage() {
  return (
    <LayoutProvider>
      <LayoutRegistryDemo />
    </LayoutProvider>
  );
}
