"use client";
import React from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import ClientForm from '@/components/clients/ClientForm';
import Link from 'next/link';

export default function NewClientPage() {
  return (
    <SuperAdminShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Create Client</h1>
            <p className="text-gray-500">Standalone client onboarding (improved UX)</p>
          </div>
          <Link href="/system/user-management" className="text-sm text-blue-600">Back to Client List</Link>
        </div>
        <ClientForm mode="create" onSuccess={(data) => {
          // Redirect to edit page or list after creation
          const id = data?.data?.id;
          if (id) window.location.href = `/system/clients/${id}/edit`;
        }} />
      </div>
    </SuperAdminShell>
  );
}
