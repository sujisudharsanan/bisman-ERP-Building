/**
 * Messages API Routes
 * Handles unread message counts and read status updates
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/messages/unread-count
 * Get unread message count for current user
 */
router.get('/unread-count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Count unread messages for the user
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE receiver_id = ${userId}::uuid
      AND read = false
      AND deleted = false
    `;

    const unreadCount = Number(count[0]?.count || 0);

    res.json({
      success: true,
      count: unreadCount
    });

  } catch (error: any) {
    console.error('[Messages] Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      count: 0
    });
  }
});

/**
 * POST /api/messages/mark-read
 * Mark all messages as read for current user
 */
router.post('/mark-read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { messageIds } = req.body;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      await prisma.$queryRaw`
        UPDATE chat_messages
        SET read = true, read_at = NOW()
        WHERE receiver_id = ${userId}::uuid
        AND id = ANY(${messageIds}::uuid[])
      `;
    } else {
      // Mark all messages as read
      await prisma.$queryRaw`
        UPDATE chat_messages
        SET read = true, read_at = NOW()
        WHERE receiver_id = ${userId}::uuid
        AND read = false
      `;
    }

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error: any) {
    console.error('[Messages] Mark read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

/**
 * GET /api/messages/recent
 * Get recent messages for current user
 */
router.get('/recent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { limit = 50 } = req.query;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const messages = await prisma.$queryRaw`
      SELECT 
        m.id,
        m.content,
        m.sender_id,
        m.receiver_id,
        m.read,
        m.created_at,
        u.name as sender_name,
        u.email as sender_email
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ${userId}::uuid OR m.receiver_id = ${userId}::uuid)
      AND m.deleted = false
      ORDER BY m.created_at DESC
      LIMIT ${Number(limit)}
    `;

    res.json({
      success: true,
      data: messages
    });

  } catch (error: any) {
    console.error('[Messages] Get recent messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent messages',
      data: []
    });
  }
});

export default router;
