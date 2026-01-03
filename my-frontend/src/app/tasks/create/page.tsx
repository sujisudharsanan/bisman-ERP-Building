/**
 * Task Creation Page
 * Standalone page for creating new tasks
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaskFormV2 } from '@/components/tasks/v2/TaskFormV2';
import { useTaskAPI } from '@/hooks/useTaskAPI';
import { FeatureGate } from '@/components/subscription/FeatureGate';

export default function CreateTaskPage() {
  const router = useRouter();
  const { createTask, loading } = useTaskAPI();

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <FeatureGate 
        feature="task_creation"
        onBlocked={() => console.log('[CreateTaskPage] Feature blocked: task_creation')}
      >
        <TaskFormV2
          mode="create"
          onCancel={handleCancel}
          onSubmit={async (data) => {
            const result = await createTask(data);
            console.log('✅ Task created:', result);
            // Redirect back to dashboard or hub incharge
            router.push('/dashboard');
          }}
          isLoading={loading}
        />
      </FeatureGate>
    </div>
  );
}
