/**
 * Task Detail View Page
 * Shows complete task information with approval controls, chat, and payment recording
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageSquare,
  Send,
  DollarSign,
  User,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface TaskDetailPageProps {
  params: {
    id: string;
  };
}

interface Message {
  id: string;
  body: string;
  type: 'TEXT' | 'APPROVAL' | 'SYSTEM' | 'PAYMENT';
  sender: {
    username: string;
  };
  createdAt: string;
}

interface TaskData {
  id: string;
  status: string;
  currentLevel: number;
  assignee: {
    id: number;
    username: string;
    role: string;
  };
  paymentRequest: {
    id: string;
    requestId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    description: string;
    notes: string;
    invoiceNumber: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    dueDate: string;
    lineItems: Array<{
      id: string;
      description: string;
      quantity: number;
      rate: number;
      taxRate: number;
      discountRate: number;
      lineTotal: number;
    }>;
  };
  expense: {
    id: string;
    amount: number;
    status: string;
  };
  messages: Message[];
  approvals: Array<{
    id: string;
    action: string;
    comment: string;
    approver: {
      username: string;
    };
    createdAt: string;
  }>;
  createdAt: string;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Action states
  const [showApprovalControls, setShowApprovalControls] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Message state
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Payment recording state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentMode: 'BankTransfer',
    transactionId: '',
    bankName: '',
    notes: '',
  });

  // Fetch task details
  const fetchTask = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get current user info
      const userResponse = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData);
      }

      // Get task details
      const response = await fetch(`http://localhost:8000/api/common/tasks/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task details');
      }

      const result = await response.json();
      setTask(result.data);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [params.id]);

  // Handle approval action
  const handleApprovalAction = async () => {
    if (!actionType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) {
        throw new Error('Not authenticated');
      }

      const endpoint = `http://localhost:8000/api/common/tasks/${params.id}/${actionType}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${actionType} task`);
      }

      alert(`Task ${actionType}d successfully!`);
      setShowApprovalControls(false);
      setComment('');
      setActionType(null);
      fetchTask(); // Refresh task data
    } catch (err: any) {
      console.error('Action error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSendingMessage(true);

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/common/tasks/${params.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: newMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      fetchTask(); // Refresh to show new message
    } catch (err: any) {
      console.error('Send message error:', err);
      alert(err.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle payment recording
  const handleRecordPayment = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:8000/api/common/tasks/${params.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMode: paymentData.paymentMode,
          transactionId: paymentData.transactionId,
          details: {
            bankName: paymentData.bankName,
          },
          notes: paymentData.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }

      alert('Payment recorded successfully!');
      setShowPaymentForm(false);
      fetchTask();
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      L1_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      L2_PENDING: { bg: 'bg-orange-100', text: 'text-orange-800' },
      FINANCE_PENDING: { bg: 'bg-blue-100', text: 'text-blue-800' },
      IN_PROCESS: { bg: 'bg-purple-100', text: 'text-purple-800' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.L1_PENDING;

    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
      >
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  // Check if current user is assigned
  const isAssignedToMe = task && currentUser && task.assignee?.id === currentUser.id;
  const canApprove =
    isAssignedToMe &&
    ['L1_PENDING', 'L2_PENDING', 'FINANCE_PENDING'].includes(task?.status || '');
  const canRecordPayment =
    isAssignedToMe && task?.status === 'IN_PROCESS' && currentUser?.role === 'BANKER';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
            <p className="text-red-800 text-lg">{error || 'Task not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition"
          >
            <ArrowLeft size={20} />
            Back to Tasks
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Task Details - {task.paymentRequest.requestId}
              </h1>
              <p className="text-gray-600">
                Assigned to: <span className="font-medium">{task.assignee?.username}</span>
              </p>
            </div>
            <div>{getStatusBadge(task.status)}</div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Request Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText size={20} />
                Payment Request Details
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-600">Client Name</label>
                  <p className="font-medium">{task.paymentRequest.clientName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Invoice Number</label>
                  <p className="font-medium">
                    {task.paymentRequest.invoiceNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Client Email</label>
                  <p className="font-medium">{task.paymentRequest.clientEmail}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Due Date</label>
                  <p className="font-medium">
                    {task.paymentRequest.dueDate
                      ? new Date(task.paymentRequest.dueDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm text-gray-600">Description</label>
                <p className="mt-1">{task.paymentRequest.description}</p>
              </div>

              {task.paymentRequest.notes && (
                <div className="mb-6">
                  <label className="text-sm text-gray-600">Notes</label>
                  <p className="mt-1 text-gray-700">{task.paymentRequest.notes}</p>
                </div>
              )}

              {/* Line Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm">
                          Description
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm">
                          Qty
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm">
                          Rate
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm">
                          Tax %
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {task.paymentRequest.lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="border border-gray-300 px-3 py-2">{item.description}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {item.quantity}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {task.paymentRequest.currency === 'INR' ? '₹' : '$'}
                            {Number(item.rate).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {item.taxRate}%
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                            {task.paymentRequest.currency === 'INR' ? '₹' : '$'}
                            {Number(item.lineTotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span className="font-medium">
                        {task.paymentRequest.currency === 'INR' ? '₹' : '$'}
                        {Number(task.paymentRequest.subtotal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax:</span>
                      <span className="font-medium">
                        {task.paymentRequest.currency === 'INR' ? '₹' : '$'}
                        {Number(task.paymentRequest.taxAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Discount:</span>
                      <span className="font-medium text-green-600">
                        -{task.paymentRequest.currency === 'INR' ? '₹' : '$'}
                        {Number(task.paymentRequest.discountAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {task.paymentRequest.currency === 'INR' ? '₹' : '$'}
                          {Number(task.paymentRequest.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Controls */}
            {canApprove && !showApprovalControls && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Approval Actions</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setActionType('approve');
                      setShowApprovalControls(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <CheckCircle size={20} />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setActionType('reject');
                      setShowApprovalControls(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <XCircle size={20} />
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setActionType('return');
                      setShowApprovalControls(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                  >
                    <RotateCcw size={20} />
                    Return for Revision
                  </button>
                </div>
              </div>
            )}

            {/* Approval Form */}
            {showApprovalControls && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {actionType === 'approve' && 'Approve Task'}
                  {actionType === 'reject' && 'Reject Task'}
                  {actionType === 'return' && 'Return for Revision'}
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment {actionType !== 'approve' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={`Enter your ${actionType} comment...`}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleApprovalAction}
                    disabled={isSubmitting || (actionType !== 'approve' && !comment.trim())}
                    className={`px-6 py-2 rounded-lg text-white transition disabled:opacity-50 ${
                      actionType === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : actionType === 'reject'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                  >
                    {isSubmitting ? 'Submitting...' : `Confirm ${actionType}`}
                  </button>
                  <button
                    onClick={() => {
                      setShowApprovalControls(false);
                      setComment('');
                      setActionType(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Payment Recording */}
            {canRecordPayment && !showPaymentForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Recording</h2>
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <DollarSign size={20} />
                  Record Payment
                </button>
              </div>
            )}

            {showPaymentForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Record Payment</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Mode
                    </label>
                    <select
                      value={paymentData.paymentMode}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, paymentMode: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BankTransfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={paymentData.transactionId}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, transactionId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="TXN123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={paymentData.bankName}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, bankName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="HDFC Bank"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Additional payment notes"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleRecordPayment}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Messages/Chat */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare size={20} />
                Messages ({task.messages.length})
              </h2>

              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {task.messages.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No messages yet</p>
                )}
                {task.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.type === 'SYSTEM'
                        ? 'bg-blue-50 border border-blue-200'
                        : message.type === 'APPROVAL'
                        ? 'bg-green-50 border border-green-200'
                        : message.type === 'PAYMENT'
                        ? 'bg-purple-50 border border-purple-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{message.sender?.username}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    {message.type !== 'TEXT' && (
                      <span className="text-xs text-gray-600 mt-1 inline-block">
                        [{message.type}]
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type a message..."
                  disabled={isSendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Task Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(task.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Current Level</label>
                  <p className="font-medium">Level {task.currentLevel}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Assignee</label>
                  <p className="font-medium">{task.assignee?.username}</p>
                  <p className="text-sm text-gray-500">{task.assignee?.role}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Created</label>
                  <p className="text-sm">
                    {new Date(task.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Approval History */}
            {task.approvals.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Approval History</h2>
                <div className="space-y-3">
                  {task.approvals.map((approval) => (
                    <div key={approval.id} className="border-l-4 border-blue-500 pl-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{approval.approver.username}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            approval.action === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : approval.action === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {approval.action}
                        </span>
                      </div>
                      {approval.comment && (
                        <p className="text-sm text-gray-700 mb-1">{approval.comment}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(approval.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
