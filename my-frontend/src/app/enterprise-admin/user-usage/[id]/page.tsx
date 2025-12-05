import { redirect } from 'next/navigation';

// Redirect to admin user-usage page
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/admin/user-usage/${params.id}`);
}
