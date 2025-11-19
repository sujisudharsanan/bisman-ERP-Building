/**
 * Chat Routes
 * API endpoints for the intelligent chat system with RBAC
 */

import { Router, Request, Response } from 'express';
import { chatService } from '../services/chat/chatService';
import { taskService } from '../services/chat/taskService';
import { rbacService, UserRole } from '../services/chat/rbacService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/chat/message
 * Send a message to the chat bot
 */
router.post('/message', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role as UserRole; // Get user role from auth

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Pass user role to chat service for RBAC
    const response = await chatService.handleMessage(userId, message.trim(), userRole);

    return res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Chat message error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message',
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const history = chatService.getHistory(userId);

    return res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
    });
  }
});

/**
 * DELETE /api/chat/history
 * Clear conversation history
 */
router.delete('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    chatService.clearContext(userId);

    return res.json({
      success: true,
      message: 'Conversation history cleared',
    });
  } catch (error) {
    console.error('Clear history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear history',
    });
  }
});

/**
 * GET /api/chat/tasks
 * Get user tasks
 */
router.get('/tasks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { status, priority, limit } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (limit) filters.limit = parseInt(limit as string);

    const tasks = await taskService.getUserTasks(userId, filters);

    return res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
    });
  }
});

/**
 * GET /api/chat/tasks/pending
 * Get pending tasks
 */
router.get('/tasks/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const tasks = await taskService.getPendingTasks(userId, limit);

    return res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    console.error('Get pending tasks error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending tasks',
    });
  }
});

/**
 * GET /api/chat/tasks/stats
 * Get task statistics
 */
router.get('/tasks/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const stats = await taskService.getTaskStats(userId);

    return res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch task statistics',
    });
  }
});

/**
 * GET /api/chat/tasks/:id
 * Get task by ID
 */
router.get('/tasks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const taskId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const task = await taskService.getTaskById(taskId, userId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    return res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
    });
  }
});

/**
 * POST /api/chat/tasks
 * Create a new task
 */
router.post('/tasks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { description, dueDate, priority, metadata } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    const task = await taskService.createTask({
      userId,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      source: 'manual',
      metadata,
    });

    return res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create task',
    });
  }
});

/**
 * PUT /api/chat/tasks/:id
 * Update a task
 */
router.put('/tasks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const taskId = parseInt(req.params.id);
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (updates.due_date) {
      updates.due_date = new Date(updates.due_date);
    }

    const task = await taskService.updateTask(taskId, userId, updates);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    return res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update task',
    });
  }
});

/**
 * PATCH /api/chat/tasks/:id/status
 * Update task status
 */
router.patch('/tasks/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const taskId = parseInt(req.params.id);
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const task = await taskService.updateTaskStatus(taskId, userId, status);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    return res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error('Update task status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update task status',
    });
  }
});

/**
 * DELETE /api/chat/tasks/:id
 * Delete a task
 */
router.delete('/tasks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const taskId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const deleted = await taskService.deleteTask(taskId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    return res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete task',
    });
  }
});

/**
 * GET /api/chat/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Chat service is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
