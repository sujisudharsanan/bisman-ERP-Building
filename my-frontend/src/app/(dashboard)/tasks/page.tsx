/**
 * Task Management Dashboard
 * Main page for task creation, viewing, and real-time chat
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TaskCreationForm } from '@/components/tasks/TaskCreationForm';
import { TaskChatSidebar } from '@/components/tasks/TaskChatSidebar';
import { TaskChatThread } from '@/components/tasks/TaskChatThread';
import { useTaskAPI } from '@/hooks/useTaskAPI';
import { useSocket } from '@/contexts/SocketContext';

export default function TaskManagementPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [selectedTaskId, setSelectedTaskId] = useState<number>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const { getMyTasks, getTask } = useTaskAPI();
  const { isConnected } = useSocket();

  // Load initial data
  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  // Load tasks
  const loadTasks = async () => {
    try {
      const myTasks = await getMyTasks();
      if (myTasks) {
        setTasks(myTasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          unreadCount: task.unreadCount || 0,
          assignee: task.assignee,
        })));
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  // Load users (mock for now - will be replaced with real API)
  const loadUsers = async () => {
    // TODO: Replace with real user API call
    setUsers([
      { id: 1, name: 'John Doe', role: 'Finance Manager', online: true, unreadCount: 3 },
      { id: 2, name: 'Jane Smith', role: 'Operations Head', online: false, unreadCount: 0 },
      { id: 3, name: 'Bob Wilson', role: 'IT Admin', online: true, unreadCount: 1 },
      { id: 4, name: 'Alice Brown', role: 'CFO', online: false, unreadCount: 0 },
      { id: 5, name: 'Charlie Davis', role: 'Staff', online: true, unreadCount: 0 },
    ]);
  };

  // Load task details
  const loadTaskDetails = async (taskId: number) => {
    try {
      const task = await getTask(taskId);
      if (task) {
        setCurrentTask({
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
          dueDate: task.dueDate,
          description: task.description,
        });
        
        // Load messages (mock for now)
        setMessages(task.messages || []);
      }
    } catch (error) {
      console.error('Failed to load task details:', error);
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskId: number) => {
    setSelectedTaskId(taskId);
    setSelectedUserId(undefined);
    loadTaskDetails(taskId);
  };

  // Handle user selection
  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    setSelectedTaskId(undefined);
    // TODO: Load user chat messages
  };

  // Handle task creation
  const handleTaskCreated = (task: any) => {
    setShowCreateForm(false);
    loadTasks();
    // Auto-select the new task
    if (task.id) {
      handleTaskSelect(task.id);
    }
  };

  // Get current user ID (from auth context - mock for now)
  const currentUserId = 1; // TODO: Get from auth context

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Task Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create, manage, and collaborate on tasks
              {isConnected && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  🟢 Real-time updates active
                </span>
              )}
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Create New Task
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <TaskChatSidebar
            users={users}
            tasks={tasks}
            selectedUserId={selectedUserId}
            selectedTaskId={selectedTaskId}
            onUserSelect={handleUserSelect}
            onTaskSelect={handleTaskSelect}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center">
          {selectedTaskId && currentTask ? (
            <TaskChatThread
              taskId={selectedTaskId}
              task={currentTask}
              messages={messages}
              currentUserId={currentUserId}
              onMessagesUpdate={setMessages}
            />
          ) : selectedUserId ? (
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                User Chat
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Direct messaging with {users.find(u => u.id === selectedUserId)?.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                (Coming soon)
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Select a task or user
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a task from the sidebar to view details and chat
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                         font-medium transition-colors"
              >
                + Create Your First Task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal/Drawer */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TaskCreationForm
              onTaskCreated={handleTaskCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
