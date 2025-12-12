/**
 * Task Components V2 - Modern Professional Design
 * 
 * Components:
 * - TaskFormV2: Create/Edit task form with validation
 * - TaskCardV2: Task cards for list/kanban views (default, compact, kanban variants)
 * - TaskDetailViewV2: Full task detail slide-out panel
 */

export { TaskFormV2 } from './TaskFormV2';
export { TaskCardV2 } from './TaskCardV2';
export { TaskDetailViewV2 } from './TaskDetailViewV2';

// Re-export types for convenience
export type { Task, TaskStatus, TaskPriority, CreateTaskInput } from '@/types/task';
