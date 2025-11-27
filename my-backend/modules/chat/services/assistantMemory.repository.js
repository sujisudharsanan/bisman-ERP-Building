/**
 * BISMAN ERP - Assistant Memory Repository
 * Manages persistent memory for per-user conversation context
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @typedef {Object} AssistantMemory
 * @property {number} userId
 * @property {number} [lastBranchId]
 * @property {string} [lastModule]
 * @property {Object} [preferences]
 * @property {string} [lastSummary]
 * @property {number} [conversationCount]
 */

class AssistantMemoryRepository {
  /**
   * Get memory for a specific user
   * @param {number} userId
   * @returns {Promise<AssistantMemory | null>}
   */
  async getByUserId(userId) {
    try {
      const memory = await prisma.assistantMemory.findUnique({
        where: { userId },
      });

      if (!memory) {
        return null;
      }

      return {
        userId: memory.userId,
        lastBranchId: memory.lastBranchId,
        lastModule: memory.lastModule,
        preferences: memory.preferences || {},
        lastSummary: memory.lastSummary,
        conversationCount: memory.conversationCount,
      };
    } catch (error) {
      console.error('Error fetching assistant memory:', error);
      return null;
    }
  }

  /**
   * Create or update memory for a user
   * @param {AssistantMemory} memory
   * @returns {Promise<void>}
   */
  async upsert(memory) {
    try {
      await prisma.assistantMemory.upsert({
        where: { userId: memory.userId },
        create: {
          userId: memory.userId,
          lastBranchId: memory.lastBranchId || null,
          lastModule: memory.lastModule || null,
          preferences: memory.preferences || {},
          lastSummary: memory.lastSummary || null,
          conversationCount: memory.conversationCount || 1,
        },
        update: {
          lastBranchId: memory.lastBranchId || null,
          lastModule: memory.lastModule || null,
          preferences: memory.preferences || {},
          lastSummary: memory.lastSummary || null,
          conversationCount: {
            increment: 1, // Increment on every update
          },
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error upserting assistant memory:', error);
      throw error;
    }
  }

  /**
   * Update only preferences for a user
   * @param {number} userId
   * @param {Object} preferences
   * @returns {Promise<void>}
   */
  async updatePreferences(userId, preferences) {
    try {
      const existing = await this.getByUserId(userId);
      
      if (!existing) {
        // Create new memory with just preferences
        await this.upsert({ userId, preferences });
        return;
      }

      // Merge with existing preferences
      await prisma.assistantMemory.update({
        where: { userId },
        data: {
          preferences: {
            ...existing.preferences,
            ...preferences,
          },
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Reset memory for a user (e.g., when switching context)
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async reset(userId) {
    try {
      await prisma.assistantMemory.update({
        where: { userId },
        data: {
          lastBranchId: null,
          lastModule: null,
          lastSummary: null,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error resetting memory:', error);
      throw error;
    }
  }

  /**
   * Delete memory for a user
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async delete(userId) {
    try {
      await prisma.assistantMemory.delete({
        where: { userId },
      });
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }

  /**
   * Get conversation count for a user
   * @param {number} userId
   * @returns {Promise<number>}
   */
  async getConversationCount(userId) {
    try {
      const memory = await prisma.assistantMemory.findUnique({
        where: { userId },
        select: { conversationCount: true },
      });
      
      return memory?.conversationCount || 0;
    } catch (error) {
      console.error('Error getting conversation count:', error);
      return 0;
    }
  }
}

module.exports = new AssistantMemoryRepository();
