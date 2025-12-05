import { redirect } from 'next/navigation';

// Redirect to admin user-usage page
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/user-usage/${id}`);
}
