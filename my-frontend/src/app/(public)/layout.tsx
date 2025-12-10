import type { Metadata } from 'next';
import './landing/fonts.css';

export const metadata: Metadata = {
  title: 'BISMAN ERP - Welcome',
  description: 'Comprehensive ERP system for modern businesses',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is nested inside root layout
  // It only wraps children - no html/body tags
  // Fonts are self-hosted for faster loading
  return <>{children}</>;
}
