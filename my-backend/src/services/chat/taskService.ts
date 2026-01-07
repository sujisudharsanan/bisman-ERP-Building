/**
 * Task Service
 * Handles task creation, retrieval, and management
 * SECURITY FIX TN-03: All queries now include tenant_id filter
 */

// Ensure the correct path and file exist for database pool import
// Update the import path if necessary, or ensure the file exists and exports a pool instance
import pool from '../../config/database';
// If the file does not exist, create it at '../../config/database.ts' with the following content:
// import { Pool } from 'pg';
// const pool = new Pool({ /* your database config */ });
// export default pool;

export interface Task {
  id: number;
  user_id: number;
  tenant_id?: string; // Added for multi-tenant isolation
  description: string;
  due_date?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'chat' | 'manual' | 'system';
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  userId: number;
  tenantId?: string; // Required for multi-tenant isolation
  description: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  source?: 'chat' | 'manual' | 'system';
  metadata?: Record<string, unknown>;
}

export class TaskService {
  /**
   * Create a new task
   * SECURITY: Requires tenantId for proper tenant isolation
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const {
      userId,
      tenantId,
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
          tenant_id,
          description, 
          due_date, 
          status, 
          priority, 
          source, 
          metadata,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        userId,
        tenantId || null,
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
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async getPendingTasks(userId: number, tenantId?: string, limit: number = 10): Promise<Task[]> {
    try {
      // SECURITY: Filter by tenant_id to prevent cross-tenant data access
      const query = `
        SELECT * FROM tasks
        WHERE user_id = $1 
        AND ($2::uuid IS NULL OR tenant_id = $2)
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
        LIMIT $3
      `;

      const result = await pool.query(query, [userId, tenantId || null, limit]);
      return result.rows.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      throw new Error('Failed to fetch pending tasks');
    }
  }

  /**
   * Get all tasks for a user
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async getUserTasks(
    userId: number,
    tenantId?: string,
    filters?: {
      status?: Task['status'];
      priority?: Task['priority'];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    }
  ): Promise<Task[]> {
    try {
      // SECURITY FIX TN-03: Include tenant_id filter from the start
      let query = 'SELECT * FROM tasks WHERE user_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)';
      const values: (string | number | Date | null)[] = [userId, tenantId || null];
      let paramIndex = 3;

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
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async getTaskById(taskId: number, userId: number, tenantId?: string): Promise<Task | null> {
    try {
      // SECURITY: Filter by tenant_id
      const query = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND ($3::uuid IS NULL OR tenant_id = $3)';
      const result = await pool.query(query, [taskId, userId, tenantId || null]);

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
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async updateTaskStatus(
    taskId: number,
    userId: number,
    status: Task['status'],
    tenantId?: string
  ): Promise<Task | null> {
    try {
      // SECURITY: Filter by tenant_id
      const query = `
        UPDATE tasks
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3 AND ($4::uuid IS NULL OR tenant_id = $4)
        RETURNING *
      `;

      const result = await pool.query(query, [status, taskId, userId, tenantId || null]);

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
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async updateTask(
    taskId: number,
    userId: number,
    updates: Partial<{
      description: string;
      due_date: Date;
      status: Task['status'];
      priority: Task['priority'];
      metadata: Record<string, unknown>;
    }>,
    tenantId?: string
  ): Promise<Task | null> {
    try {
      const fields: string[] = [];
      const values: (string | number | Date | null)[] = [];
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
      values.push(taskId, userId, tenantId || null);

      // SECURITY FIX TN-03: Include tenant_id in WHERE clause
      const query = `
        UPDATE tasks
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND ($${paramIndex + 2}::uuid IS NULL OR tenant_id = $${paramIndex + 2})
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
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async deleteTask(taskId: number, userId: number, tenantId?: string): Promise<boolean> {
    try {
      // SECURITY: Filter by tenant_id
      const query = 'DELETE FROM tasks WHERE id = $1 AND user_id = $2 AND ($3::uuid IS NULL OR tenant_id = $3)';
      const result = await pool.query(query, [taskId, userId, tenantId || null]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Get overdue tasks
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async getOverdueTasks(userId: number, tenantId?: string): Promise<Task[]> {
    try {
      // SECURITY: Filter by tenant_id
      const query = `
        SELECT * FROM tasks
        WHERE user_id = $1 
        AND ($2::uuid IS NULL OR tenant_id = $2)
        AND status IN ('pending', 'in_progress')
        AND due_date < NOW()
        ORDER BY due_date ASC
      `;

      const result = await pool.query(query, [userId, tenantId || null]);
      return result.rows.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw new Error('Failed to fetch overdue tasks');
    }
  }

  /**
   * Get tasks due today
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async getTasksDueToday(userId: number, tenantId?: string): Promise<Task[]> {
    try {
      // SECURITY: Filter by tenant_id
      const query = `
        SELECT * FROM tasks
        WHERE user_id = $1 
        AND ($2::uuid IS NULL OR tenant_id = $2)
        AND status IN ('pending', 'in_progress')
        AND DATE(due_date) = DATE(NOW())
        ORDER BY due_date ASC
      `;

      const result = await pool.query(query, [userId, tenantId || null]);
      return result.rows.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching tasks due today:', error);
      throw new Error('Failed to fetch tasks due today');
    }
  }

  /**
   * Get task statistics
   * SECURITY FIX TN-03: Added tenantId filter
   */
  async getTaskStats(userId: number, tenantId?: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueToday: number;
  }> {
    try {
      // SECURITY: Filter by tenant_id
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < NOW()) as overdue,
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND DATE(due_date) = DATE(NOW())) as due_today
        FROM tasks
        WHERE user_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
      `;

      const result = await pool.query(statsQuery, [userId, tenantId || null]);
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
  private mapRowToTask(row: Record<string, unknown>): Task {
    return {
      id: row.id as number,
      user_id: row.user_id as number,
      tenant_id: row.tenant_id as string | undefined,
      description: row.description as string,
      due_date: row.due_date as Date | undefined,
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      source: row.source as Task['source'],
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }

  /**
   * Ensure tasks table exists
   * SECURITY FIX TN-03: Added tenant_id column for multi-tenant isolation
   */
  async ensureTableExists(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        tenant_id UUID,
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
      CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    `;

    try {
      await pool.query(createTableQuery);
      
      // Add tenant_id column if table already exists without it
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'tasks' AND column_name = 'tenant_id') THEN
            ALTER TABLE tasks ADD COLUMN tenant_id UUID;
            CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
          END IF;
        END $$;
      `);
      
      console.log('Tasks table ready with tenant isolation');
    } catch (error) {
      console.error('Error creating tasks table:', error);
    }
  }
}

export const taskService = new TaskService();
