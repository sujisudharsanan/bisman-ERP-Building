/**
 * Task Approvals Dashboard Page
 * Shows pending, in-process, and completed tasks
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, Eye, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  paymentRequest: {
    requestId: string;
    clientName: string;
    description: string;
    totalAmount: number;
    currency: string;
  };
  status: string;
  currentLevel: number;
  assignee: {
    username: string;
  };
  createdAt: string;
}

export default function TaskApprovalsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'inprocess' | 'completed'>('pending');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks based on active tab
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const endpoint = `http://localhost:8000/api/common/tasks/dashboard/${activeTab}`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const result = await response.json();
      setTasks(result.data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      L1_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      L2_PENDING: { bg: 'bg-orange-100', text: 'text-orange-800', icon: Clock },
      FINANCE_PENDING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      IN_PROCESS: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Clock },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.L1_PENDING;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon size={14} />
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getLevelBadge = (level: number) => {
    const levels = ['', 'L1', 'L2', 'Finance', 'Banker'];
    return (
      <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
        {levels[level] || `Level ${level}`}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Task Approvals</h1>
          <p className="text-gray-600">Manage payment approval workflow</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock size={18} />
                Pending Tasks
              </div>
            </button>
            <button
              onClick={() => setActiveTab('inprocess')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === 'inprocess'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Filter size={18} />
                In Process
              </div>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === 'completed'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle size={18} />
                Completed
              </div>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        )}

        {/* Tasks List */}
        {!isLoading && tasks.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No tasks found</p>
          </div>
        )}

        {!isLoading && tasks.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {task.paymentRequest.requestId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.paymentRequest.clientName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {task.paymentRequest.description.substring(0, 50)}
                      {task.paymentRequest.description.length > 50 && '...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {task.paymentRequest.currency === 'INR' ? '₹' : '$'}
                      {task.paymentRequest.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getLevelBadge(task.currentLevel)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {task.assignee?.username || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/common/task-approvals/${task.id}`)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create New Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => router.push('/common/payment-requests/create')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Create New Payment Request
          </button>
        </div>
      </div>
    </div>
  );
}
