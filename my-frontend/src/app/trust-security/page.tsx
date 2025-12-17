/**
 * 🛡️ Trust & Security Page Route
 * 
 * Customer-facing informational page explaining BISMAN ERP's
 * security practices in simple, non-technical language.
 */

import TrustSecurityPage from '@/modules/system/pages/trust-security';

export default function Page() {
  return <TrustSecurityPage />;
}

export const metadata = {
  title: 'Trust & Security | BISMAN ERP',
  description: 'Learn how BISMAN ERP keeps your business data safe, private, and under your control.',
};
