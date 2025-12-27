import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - BISMAN ERP',
  description: 'Choose the perfect plan for your business. No credit card required.',
  openGraph: {
    title: 'Pricing - BISMAN ERP',
    description: 'Simple, transparent pricing. Choose the plan that fits your business needs.',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
