import { redirect } from 'next/navigation';

// Redirect to the main enterprise-admin audit page
export default function Page() {
  redirect('/enterprise-admin/audit');
}
