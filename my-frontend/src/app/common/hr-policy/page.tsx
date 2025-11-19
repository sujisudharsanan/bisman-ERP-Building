/**
 * HR Policy Manual - International Standard
 * Accessible to all employees across all roles
 */
import HRPolicyPage from '@/modules/hr/pages/hr-policy';

export const metadata = {
  title: 'HR Policy Manual | BISMAN ERP',
  description: 'International standard HR policies covering code of conduct, recruitment, leave, performance, and compliance',
};

export default function Page() {
  return <HRPolicyPage />;
}
