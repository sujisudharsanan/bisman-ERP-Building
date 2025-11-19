/**
 * Task Service
 * Handles task creation, retrieval, and management
 */

import pool from '../../config/database';

export interface Task {
  id: number;
  user_id: number;
  description: string;
  due_date?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'chat' | 'manual' | 'system';
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  userId: number;
  description: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  source?: 'chat' | 'manual' | 'system';
  metadata?: any;
}

export class TaskService {
  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const {
      userId,
      description,
      dueDate,
      priority = 'medium',
      source = 'chat',
      metadata,
    } = input;

    try {
      const query = `
        INSERT INTO tasks (
          user_id, 
          description, 
          due_date, 
          status, 
          priority, 
          source, 
          metadata,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        userId,
        description,
        dueDate || null,
        'pending',
        priority,
        source,
        metadata ? JSON.stringify(metadata) : null,
      ];

      const result = await pool.query(query, values);
      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  /**
   * Get pending tasks for a user
   */
  async getPendingTasks(userId: number, limit: number = 10): Promise<Task[]> {
    try {
      const query = `
        SELECT * FROM tasks
        WHERE user_id = $1 
        AND status IN ('pending', 'in_progress')
        ORDER BY 
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          due_date ASC NULLS LAST,
          created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);
      return result.rows.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      throw new Error('Failed to fetch pending tasks');
    }
  }

  /**
   * Get all tasks for a user
   */
  async getUserTasks(
    userId: number,
    filters?: {
      status?: Task['status'];
      priority?: Task['priority'];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    }
  ): Promise<Task[]> {
    try {
      let query = 'SELECT * FROM tasks WHERE user_id = $1';
      const values: any[] = [userId];
      let paramIndex = 2;

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      if (filters?.priority) {
        query += ` AND priority = $${paramIndex}`;
        values.push(filters.priority);
        paramIndex++;
      }

      if (filters?.fromDate) {
        query += ` AND created_at >= $${paramIndex}`;
        values.push(filters.fromDate);
        paramIndex++;
      }

      if (filters?.toDate) {
        query += ` AND created_at <= $${paramIndex}`;
        values.push(filters.toDate);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(filters.limit);
      }

      const result = await pool.query(query, values);
      return result.rows.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      throw new Error('Failed to fetch user tasks');
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: number, userId: number): Promise<Task | null> {
    try {
      const query = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2';
      const result = await pool.query(query, [taskId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      console.error('Error fetching task by ID:', error);
      throw new Error('Failed to fetch task');
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: number,
    userId: number,
    status: Task['status']
  ): Promise<Task | null> {
    try {
      const query = `
        UPDATE tasks
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await pool.query(query, [status, taskId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      console.error('Error updating task status:', error);
      throw new Error('Failed to update task status');
    }
  }

  /**
   * Update task
   */
  async updateTask(
    taskId: number,
    userId: number,
    updates: Partial<{
      description: string;
      due_date: Date;
      status: Task['status'];
      priority: Task['priority'];
      metadata: any;
    }>
  ): Promise<Task | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex}`);
        values.push(updates.description);
        paramIndex++;
      }

      if (updates.due_date !== undefined) {
        fields.push(`due_date = $${paramIndex}`);
        values.push(updates.due_date);
        paramIndex++;
      }

      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }

      if (updates.priority !== undefined) {
        fields.push(`priority = $${paramIndex}`);
        values.push(updates.priority);
        paramIndex++;
      }

      if (updates.metadata !== undefined) {
        fields.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(taskId, userId);

      const query = `
        UPDATE tasks
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: number, userId: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM tasks WHERE id = $1 AND user_id = $2';
      const result = await pool.query(query, [taskId, userId]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId: number): Promise<Task[]> {
    try {
      const query = `
        SELECT * FROM tasks
        WHERE user_id = $1 
        AND status IN ('pending', 'in_progress')
        AND due_date < NOW()
        ORDER BY due_date ASC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw new Error('Failed to fetch overdue tasks');
    }
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(userId: number): Promise<Task[]> {
    try {
      const query = `
        SELECT * FROM tasks
        WHERE user_id = $1 
        AND status IN ('pending', 'in_progress')
        AND DATE(due_date) = DATE(NOW())
        ORDER BY due_date ASC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching tasks due today:', error);
      throw new Error('Failed to fetch tasks due today');
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStats(userId: number): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueToday: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < NOW()) as overdue,
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND DATE(due_date) = DATE(NOW())) as due_today
        FROM tasks
        WHERE user_id = $1
      `;

      const result = await pool.query(statsQuery, [userId]);
      const row = result.rows[0];

      return {
        total: parseInt(row.total) || 0,
        pending: parseInt(row.pending) || 0,
        inProgress: parseInt(row.in_progress) || 0,
        completed: parseInt(row.completed) || 0,
        overdue: parseInt(row.overdue) || 0,
        dueToday: parseInt(row.due_today) || 0,
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      throw new Error('Failed to fetch task statistics');
    }
  }

  /**
   * Map database row to Task object
   */
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      due_date: row.due_date,
      status: row.status,
      priority: row.priority,
      source: row.source,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Ensure tasks table exists
   */
  async ensureTableExists(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        due_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('chat', 'manual', 'system')),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    `;

    try {
      await pool.query(createTableQuery);
      console.log('Tasks table ready');
    } catch (error) {
      console.error('Error creating tasks table:', error);
    }
  }
}

export const taskService = new TaskService();
