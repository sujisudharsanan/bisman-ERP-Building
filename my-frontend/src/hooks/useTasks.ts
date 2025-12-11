/**
 * Task TanStack Query Hooks
 * React Query hooks for task management with optimistic updates
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskApi, Task, KanbanData, CreateTaskInput, UpdateTaskInput, UpdateStatusInput, UpdatePositionInput, CreateMessageInput, TaskMessage, TaskAttachment, ListTasksParams } from '@/lib/api/taskApi';

// ============================================
// QUERY KEYS
// ============================================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params?: ListTasksParams) => [...taskKeys.lists(), params] as const,
  kanban: () => [...taskKeys.all, 'kanban'] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  messages: (taskId: string) => [...taskKeys.all, taskId, 'messages'] as const,
  attachments: (taskId: string) => [...taskKeys.all, taskId, 'attachments'] as const,
};

// ============================================
// LIST & FETCH HOOKS
// ============================================

/**
 * Fetch tasks list with filters
 */
export function useTasks(params?: ListTasksParams) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => taskApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch Kanban board data
 */
export function useKanbanTasks() {
  return useQuery({
    queryKey: taskKeys.kanban(),
    queryFn: taskApi.getKanban,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single task by ID
 */
export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id!),
    queryFn: () => taskApi.getById(id!),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch task messages
 */
export function useTaskMessages(taskId: string | null | undefined, page = 1) {
  return useQuery({
    queryKey: taskKeys.messages(taskId!),
    queryFn: () => taskApi.getMessages(taskId!, page),
    enabled: !!taskId,
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Fetch task attachments
 */
export function useTaskAttachments(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskKeys.attachments(taskId!),
    queryFn: () => taskApi.getAttachments(taskId!),
    enabled: !!taskId,
    staleTime: 60 * 1000,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create task mutation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateTaskInput) => taskApi.create(input),
    onSuccess: (newTask) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
      
      // Optimistically add to cache
      queryClient.setQueryData<Task[]>(taskKeys.list(), (old) => {
        if (!old) return [newTask];
        return [newTask, ...old];
      });
      
      toast.success('Task created', {
        description: `"${newTask.title}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create task', {
        description: error.message || 'Please try again.',
      });
    },
  });
}

/**
 * Update task mutation
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => 
      taskApi.update(id, input),
    onMutate: async ({ id, input }) => {
      // Cancel outgoing fetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      
      // Snapshot previous value
      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id));
      
      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData<Task>(taskKeys.detail(id), {
          ...previousTask,
          ...input,
          updated_at: new Date().toISOString(),
        });
      }
      
      return { previousTask };
    },
    onError: (err: Error, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      toast.error('Failed to update task', {
        description: err.message || 'Your changes could not be saved.',
      });
    },
    onSuccess: () => {
      toast.success('Task updated');
    },
    onSettled: (_, __, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
    },
  });
}

/**
 * Update task status mutation
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStatusInput }) => 
      taskApi.updateStatus(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.kanban() });
      
      const previousKanban = queryClient.getQueryData<KanbanData>(taskKeys.kanban());
      
      // Optimistically update Kanban
      if (previousKanban) {
        const newKanban = { ...previousKanban };
        
        // Find and remove task from current column
        let movedTask: Task | undefined;
        for (const status of Object.keys(newKanban) as (keyof KanbanData)[]) {
          const taskIndex = newKanban[status].findIndex(t => t.id === id);
          if (taskIndex !== -1) {
            [movedTask] = newKanban[status].splice(taskIndex, 1);
            break;
          }
        }
        
        // Add to new column
        if (movedTask && input.status in newKanban) {
          newKanban[input.status as keyof KanbanData].unshift({
            ...movedTask,
            status: input.status,
            updated_at: new Date().toISOString(),
          });
        }
        
        queryClient.setQueryData(taskKeys.kanban(), newKanban);
      }
      
      return { previousKanban };
    },
    onError: (err: Error, _, context) => {
      if (context?.previousKanban) {
        queryClient.setQueryData(taskKeys.kanban(), context.previousKanban);
      }
      toast.error('Failed to update status', {
        description: err.message || 'Could not change task status.',
      });
    },
    onSuccess: (_, { input }) => {
      toast.success(`Status changed to ${input.status}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Update task position mutation (drag-and-drop)
 */
export function useUpdateTaskPosition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePositionInput }) => 
      taskApi.updatePosition(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.kanban() });
      
      const previousKanban = queryClient.getQueryData<KanbanData>(taskKeys.kanban());
      
      if (previousKanban) {
        const newKanban = { ...previousKanban };
        
        // Find task and its current column
        let movedTask: Task | undefined;
        let sourceColumn: keyof KanbanData | undefined;
        
        for (const status of Object.keys(newKanban) as (keyof KanbanData)[]) {
          const taskIndex = newKanban[status].findIndex(t => t.id === id);
          if (taskIndex !== -1) {
            [movedTask] = newKanban[status].splice(taskIndex, 1);
            sourceColumn = status;
            break;
          }
        }
        
        // Insert at new position
        if (movedTask && input.status in newKanban) {
          const targetColumn = input.status as keyof KanbanData;
          const updatedTask = {
            ...movedTask,
            status: input.status,
            position: input.position,
          };
          
          // Copy target array
          const targetTasks = [...newKanban[targetColumn]];
          
          // Insert at position
          targetTasks.splice(input.position, 0, updatedTask);
          
          // Update positions
          newKanban[targetColumn] = targetTasks.map((t, idx) => ({
            ...t,
            position: idx,
          }));
        }
        
        queryClient.setQueryData(taskKeys.kanban(), newKanban);
      }
      
      return { previousKanban };
    },
    onError: (err: Error, _, context) => {
      if (context?.previousKanban) {
        queryClient.setQueryData(taskKeys.kanban(), context.previousKanban);
      }
      toast.error('Failed to move task', {
        description: err.message || 'Could not update task position.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
    },
  });
}

/**
 * Delete task mutation
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.kanban() });
      
      const previousKanban = queryClient.getQueryData<KanbanData>(taskKeys.kanban());
      
      // Optimistically remove from Kanban
      if (previousKanban) {
        const newKanban = { ...previousKanban };
        for (const status of Object.keys(newKanban) as (keyof KanbanData)[]) {
          newKanban[status] = newKanban[status].filter(t => t.id !== id);
        }
        queryClient.setQueryData(taskKeys.kanban(), newKanban);
      }
      
      return { previousKanban };
    },
    onError: (err: Error, _, context) => {
      if (context?.previousKanban) {
        queryClient.setQueryData(taskKeys.kanban(), context.previousKanban);
      }
      toast.error('Failed to delete task', {
        description: err.message || 'Could not delete the task.',
      });
    },
    onSuccess: () => {
      toast.success('Task deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Create task message mutation
 */
export function useCreateTaskMessage(taskId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateMessageInput) => taskApi.createMessage(taskId, input),
    onSuccess: (newMessage) => {
      // Append message to cache
      queryClient.setQueryData<TaskMessage[]>(taskKeys.messages(taskId), (old) => {
        if (!old) return [newMessage];
        return [...old, newMessage];
      });
      
      // Update message count on task
      queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) => {
        if (!old) return old;
        return {
          ...old,
          message_count: (old.message_count || 0) + 1,
        };
      });
    },
    onError: (err: Error) => {
      toast.error('Failed to send message', {
        description: err.message || 'Could not send your message.',
      });
    },
  });
}

/**
 * Upload attachment mutation
 */
export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => taskApi.uploadAttachment(taskId, file),
    onSuccess: (newAttachment) => {
      // Append attachment to cache
      queryClient.setQueryData<TaskAttachment[]>(taskKeys.attachments(taskId), (old) => {
        if (!old) return [newAttachment];
        return [...old, newAttachment];
      });
      
      // Update attachment count on task
      queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) => {
        if (!old) return old;
        return {
          ...old,
          attachment_count: (old.attachment_count || 0) + 1,
        };
      });
      
      toast.success('File uploaded', {
        description: newAttachment.file_name || 'Attachment added successfully.',
      });
    },
    onError: (err: Error) => {
      toast.error('Failed to upload file', {
        description: err.message || 'Could not upload the attachment.',
      });
    },
  });
}

// ============================================
// REAL-TIME INVALIDATION
// ============================================

/**
 * Hook to handle real-time task updates
 * Call the returned invalidate functions when receiving socket events
 */
export function useTaskInvalidation() {
  const queryClient = useQueryClient();
  
  return {
    invalidateTask: (taskId: string) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
    invalidateKanban: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    invalidateMessages: (taskId: string) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.messages(taskId) });
    },
    invalidateAttachments: (taskId: string) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.attachments(taskId) });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    
    // Direct cache updates for optimistic UI
    updateTaskInCache: (task: Task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
    addMessageToCache: (taskId: string, message: TaskMessage) => {
      queryClient.setQueryData<TaskMessage[]>(taskKeys.messages(taskId), (old) => {
        if (!old) return [message];
        // Avoid duplicates
        if (old.some(m => m.id === message.id)) return old;
        return [...old, message];
      });
    },
    addAttachmentToCache: (taskId: string, attachment: TaskAttachment) => {
      queryClient.setQueryData<TaskAttachment[]>(taskKeys.attachments(taskId), (old) => {
        if (!old) return [attachment];
        if (old.some(a => a.id === attachment.id)) return old;
        return [...old, attachment];
      });
    },
  };
}
