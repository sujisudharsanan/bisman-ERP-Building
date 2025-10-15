import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Hub Incharge Dashboard | BISMAN ERP',
  description: 'Operational dashboard for Hub Incharge role in BISMAN ERP',
};

export default function HubInchargeLayout({ children }: { children: React.ReactNode }) {
  // Server component wrapper solely to provide metadata override
  return <>{children}</>;
}
