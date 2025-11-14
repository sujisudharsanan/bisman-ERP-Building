/**
 * Task Service (JavaScript)
 * Handles task CRUD operations for the chat engine
 */

const { Pool } = require('pg');

// Database connection
let pool;
try {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    pool = new Pool({ connectionString: databaseUrl });
  }
} catch (e) {
  console.warn('[TaskService] Database not available');
}

class TaskService {
  constructor() {
    this.ensureTableExists();
  }

  /**
   * Ensure chat_tasks table exists
   */
  async ensureTableExists() {
    if (!pool) return;

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_tasks (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          organization_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          due_date DATE,
          created_by TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_chat_tasks_user ON chat_tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_chat_tasks_status ON chat_tasks(status);
        CREATE INDEX IF NOT EXISTS idx_chat_tasks_due_date ON chat_tasks(due_date);
      `);
    } catch (error) {
      console.error('[TaskService] Error creating table:', error.message);
    }
  }

  /**
   * Get pending tasks for a user
   */
  async getPendingTasks(userId) {
    if (!pool) {
      return [];
    }

    try {
      const result = await pool.query(`
        SELECT * FROM chat_tasks
        WHERE user_id = $1 AND status = 'pending'
        ORDER BY due_date ASC NULLS LAST, created_at DESC;
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('[TaskService] Error fetching pending tasks:', error);
      return [];
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStats(userId) {
    if (!pool) {
      return { total: 0, pending: 0, completed: 0, overdue: 0 };
    }

    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) as overdue
        FROM chat_tasks
        WHERE user_id = $1;
      `, [userId]);

      return result.rows[0] || { total: 0, pending: 0, completed: 0, overdue: 0 };
    } catch (error) {
      console.error('[TaskService] Error fetching stats:', error);
      return { total: 0, pending: 0, completed: 0, overdue: 0 };
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId, userId) {
    if (!pool) {
      return null;
    }

    try {
      const result = await pool.query(`
        SELECT * FROM chat_tasks
        WHERE id = $1 AND user_id = $2;
      `, [taskId, userId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('[TaskService] Error fetching task:', error);
      return null;
    }
  }

  /**
   * Update task
   */
  async updateTask(taskId, userId, updates) {
    if (!pool) {
      return null;
    }

    try {
      const allowedFields = ['title', 'description', 'priority', 'status', 'due_date'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return null;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(taskId, userId);

      const query = `
        UPDATE chat_tasks
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *;
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[TaskService] Error updating task:', error);
      return null;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId, userId) {
    if (!pool) {
      return false;
    }

    try {
      const result = await pool.query(`
        DELETE FROM chat_tasks
        WHERE id = $1 AND user_id = $2
        RETURNING id;
      `, [taskId, userId]);

      return result.rowCount > 0;
    } catch (error) {
      console.error('[TaskService] Error deleting task:', error);
      return false;
    }
  }
}

module.exports = TaskService;
