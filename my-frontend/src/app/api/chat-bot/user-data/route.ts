/**
 * Chat Bot User Data API
 * Fetches user's pending tasks, meetings, payment requests, and notifications
 * GET /api/chat-bot/user-data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
  // Accept multiple cookie names for compatibility
  const authToken = await requireAuthCookie(['authToken', 'token', 'access_token']);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch all user data in parallel
  const [pendingTasks, inProcessTasks, completedTasks, paymentRequests] = await Promise.allSettled([
      // Pending tasks
      fetch(`${BACKEND_URL}/api/common/tasks/dashboard/pending`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }),
      // In-process tasks
      fetch(`${BACKEND_URL}/api/common/tasks/dashboard/inprocess`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }),
      // Recently completed tasks
      fetch(`${BACKEND_URL}/api/common/tasks/dashboard/completed?limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }),
      // Payment requests
      fetch(`${BACKEND_URL}/api/common/payment-requests`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    ]);

    // Process results
    const pending = pendingTasks.status === 'fulfilled' ? await pendingTasks.value.json() : { data: [], count: 0 };
    const inProcess = inProcessTasks.status === 'fulfilled' ? await inProcessTasks.value.json() : { data: [], count: 0 };
    const completed = completedTasks.status === 'fulfilled' ? await completedTasks.value.json() : { data: [], count: 0 };
    const payments = paymentRequests.status === 'fulfilled' ? await paymentRequests.value.json() : { data: [], count: 0 };

    // Categorize data
    const userData = {
      summary: {
        pendingApprovals: pending.count || 0,
        inProcessTasks: inProcess.count || 0,
        completedRecently: completed.count || 0,
        totalPaymentRequests: payments.count || 0,
      },
      pendingTasks: (pending.data || []).slice(0, 5).map((task: any) => ({
        id: task.id,
        type: task.type || 'APPROVAL',
        title: task.title || task.paymentRequest?.requestId || 'Task',
        amount: task.paymentRequest?.totalAmount || 0,
        currency: task.paymentRequest?.currency || 'INR',
        clientName: task.paymentRequest?.clientName || 'N/A',
        createdAt: task.createdAt,
        currentLevel: task.currentLevel,
        status: task.status,
      })),
      recentPayments: (payments.data || [])
        .filter((pr: any) => pr.status === 'DRAFT' || pr.status === 'PENDING')
        .slice(0, 5)
        .map((pr: any) => ({
          id: pr.id,
          requestId: pr.requestId,
          clientName: pr.clientName,
          totalAmount: pr.totalAmount,
          currency: pr.currency,
          status: pr.status,
          createdAt: pr.createdAt,
        })),
      notifications: [
        ...(pending.data || []).slice(0, 3).map((task: any) => ({
          id: `task-${task.id}`,
          type: 'approval_pending',
          message: `Approval pending: ${task.paymentRequest?.clientName || 'Task'} - ${task.paymentRequest?.currency || 'INR'} ${task.paymentRequest?.totalAmount || 0}`,
          timestamp: task.createdAt,
          priority: 'high',
        })),
        ...(inProcess.data || []).slice(0, 2).map((task: any) => ({
          id: `inprocess-${task.id}`,
          type: 'task_in_progress',
          message: `In progress: ${task.paymentRequest?.clientName || 'Task'}`,
          timestamp: task.updatedAt,
          priority: 'medium',
        })),
      ].slice(0, 5),
    };

    return NextResponse.json({
      success: true,
      data: userData,
    });

  } catch (error: any) {
    console.error('Chat bot user data error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user data', details: error.message },
      { status: 500 }
    );
  }
}
