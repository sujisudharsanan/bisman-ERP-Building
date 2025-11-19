/**
 * Production-Ready Page Template
 * Use this template for all new pages to ensure consistency
 */

import React from 'react';
import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ForbiddenPage } from '@/components/common/ForbiddenPage';
import { LoadingPage } from '@/components/common/LoadingPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// TypeScript interfaces for props and data
interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  params?: { [key: string]: string };
}

interface PageData {
  // Define your data structure here
  items: any[];
  totalCount: number;
  loading: boolean;
  error: string | null;
}

// Metadata for SEO and page info
export const metadata: Metadata = {
  title: 'Page Title | BISMAN ERP',
  description: 'Page description for SEO',
};

// Main page component
export default function PageTemplate({ searchParams, params }: PageProps) {
  return (
    <ErrorBoundary>
      <PermissionGate
        featureKey="feature-name"
        action="view"
        fallback={<ForbiddenPage />}
      >
        <PageContent searchParams={searchParams} params={params} />
      </PermissionGate>
    </ErrorBoundary>
  );
}

// Separate content component for better organization
function PageContent({ searchParams, params }: PageProps) {
  // State management
  const [data, setData] = React.useState<PageData>({
    items: [],
    totalCount: 0,
    loading: true,
    error: null,
  });

  // Fetch data effect
  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // TODO: Replace with actual API call
      // const response = await api.get('/api/v1/your-endpoint')
      // setData(prev => ({
      //   ...prev,
      //   items: response.data.data,
      //   totalCount: response.data.totalCount,
      //   loading: false
      // }))

      // Mock data for template
      setTimeout(() => {
        setData({
          items: [],
          totalCount: 0,
          loading: false,
          error: null,
        });
      }, 1000);
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  };

  // Loading state
  if (data.loading) {
    return <LoadingPage />;
  }

  // Error state
  if (data.error) {
    return (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
        <PageHeader />
        <div className="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="text-center">
              <div className="text-red-600 text-sm">{data.error}</div>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col content-under-navbar">
      <PageHeader />

      <main className="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Main Content Card */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Content Section
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Replace this with your actual page content
              </p>
            </div>

            {/* Content Area */}
            <div className="space-y-6">
              {/* Example: Data Table */}
              {data.items.length > 0 ? (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Column 1
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Column 2
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {/* Item data */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {/* Item data */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState onAction={() => { /* console.log('Create new item') */ }} />
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Page header component
function PageHeader() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Page Title</h1>

          <div className="flex space-x-3">
            <PermissionGate featureKey="feature-name" action="create">
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
                <span>Create New</span>
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>
    </header>
  );
}

// Empty state component
function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400">{/* Icon here */}</div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
      <p className="mt-1 text-sm text-gray-500">
        Get started by creating your first item.
      </p>
      <div className="mt-6">
        <PermissionGate featureKey="feature-name" action="create">
          <button
            onClick={onAction}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create Item
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}
