/**
 * Task Creation Page
 * Standalone page for creating new tasks
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TaskCreationForm } from '@/components/tasks/TaskCreationForm';

export default function CreateTaskPage() {
  const router = useRouter();

  const handleTaskCreated = (task: any) => {
    console.log('✅ Task created:', task);
    // Redirect back to hub incharge or wherever appropriate
    router.push('/hub-incharge');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Task
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Fill in the details below to create a new task
            </p>
          </div>
          
          <TaskCreationForm
            onTaskCreated={handleTaskCreated}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
