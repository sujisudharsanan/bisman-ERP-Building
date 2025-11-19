'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import TaskChatDrawer from '@/components/tasks/TaskChatDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useWorkflowTasks } from '@/hooks/useWorkflowTasks';

export default function HubInchargePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { connected } = useSocket();
  const { tasks, groupedTasks, loading: tasksLoading, createTask } = useWorkflowTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Get user role, normalize it for comparison
  const userRole = (user?.roleName || user?.role || '').toUpperCase().replace(/[_\s-]/g, '_');

  // Redirect if user is not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      console.log('🚫 No user authenticated, redirecting to login');
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || tasksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Hub Incharge Dashboard...</p>
          {connected && <p className="text-green-400 text-sm mt-2">✓ Connected to server</p>}
        </div>
      </div>
    );
  }

  // Allow access for authenticated users (Hub Incharge, STAFF, or compatible roles)
  if (!user) {
    console.log('🚫 No user, not rendering page');
    return null;
  }

  console.log('✅ Rendering Hub Incharge page for user:', user.username, 'role:', user.roleName || user.role);

  return (
    <DashboardLayout role={user.roleName || user.role || 'Hub Incharge'}>
    <div className="h-full max-w-full min-h-0">
  <div className="w-full min-h-0">
            {/* main content area; grid will scroll and split stays at bottom */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="w-full flex-1 overflow-hidden">
                <div className="flex justify-between gap-3 md:gap-5 mb-1 ml-3 md:ml-4 mr-3 md:mr-4 h-full">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="grid gap-3 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr h-full overflow-y-auto pr-1 pb-0 mb-0 custom-scrollbar min-h-0">
                      <div>
                        <KanbanColumn 
                          title="DRAFT" 
                          tasks={groupedTasks.draft} 
                          showCreate 
                          onCreate={() => { window.location.href = '/tasks/create'; }}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                      </div>
                      <div>
                        <KanbanColumn 
                          title="CONFIRMED" 
                          tasks={groupedTasks.confirmed}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                      </div>
                      <div>
                        <KanbanColumn 
                          title="IN PROGRESS" 
                          tasks={groupedTasks.in_progress}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                      </div>
                      <div>
                        <KanbanColumn 
                          title="DONE" 
                          tasks={groupedTasks.done}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex-none hidden lg:block h-full">
                    <RightPanel mode="dock" />
                  </div>
                </div>
              </div>

              {/* Extended section removed as requested */}
            </main>
          {/* No inline grid when using dock */}
        </div>
      </div>

      {/* Task Chat Drawer */}
      {selectedTaskId && user && (
        <TaskChatDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          currentUserId={user.id?.toString() || ''}
          currentUserType={user.roleName || user.role || 'USER'}
          onTaskUpdate={(updatedTask) => {
            console.log('Task updated:', updatedTask);
            // The useWorkflowTasks hook will automatically update via Socket.IO
          }}
        />
      )}
    </DashboardLayout>
  );
}
