export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function UsersRolesPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Users & Roles</h1>
        <Link
          href="/admin/users/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </Link>
      </div>
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4">TODO: Users & Roles management</div>
    </div>
  );
}
