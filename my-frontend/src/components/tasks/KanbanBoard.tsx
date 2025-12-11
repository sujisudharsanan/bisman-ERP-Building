/**
 * DnD Kanban Board
 * Drag-and-drop Kanban board using dnd-kit with TanStack Query
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  MoreHorizontal, 
  MessageSquare, 
  Paperclip,
  Flag,
  Calendar,
  User,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKanbanTasks, useUpdateTaskPosition, useUpdateTaskStatus } from '@/hooks/useTasks';
import { Task, KanbanData } from '@/lib/api/taskApi';

// ============================================
// TYPES
// ============================================

// Kanban-only statuses (excludes CANCELLED which is terminal)
type KanbanStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'NEED_ATTENTION' | 'DONE';

interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  color: string;
  bgColor: string;
}

interface KanbanBoardProps {
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (status: KanbanStatus) => void;
}

// ============================================
// COLUMN CONFIG
// ============================================

const columns: KanbanColumn[] = [
  { id: 'ASSIGNED', title: 'Assigned', color: 'border-slate-400', bgColor: 'bg-slate-50' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-400', bgColor: 'bg-blue-50' },
  { id: 'NEED_ATTENTION', title: 'Needs Attention', color: 'border-amber-400', bgColor: 'bg-amber-50' },
  { id: 'DONE', title: 'Completed', color: 'border-green-400', bgColor: 'bg-green-50' },
];

const priorityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

// ============================================
// MAIN COMPONENT
// ============================================

export function KanbanBoard({ onTaskClick, onCreateTask }: KanbanBoardProps) {
  const { data: kanbanData, isLoading, error } = useKanbanTasks();
  const updatePosition = useUpdateTaskPosition();
  const updateStatus = useUpdateTaskStatus();
  
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [localKanban, setLocalKanban] = useState<KanbanData | null>(null);

  // Use local state during drag, fallback to server data
  const displayData = localKanban || kanbanData;

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find task by ID across all columns
  const findTask = useCallback((id: UniqueIdentifier): Task | undefined => {
    if (!displayData) return undefined;
    for (const status of Object.keys(displayData) as (keyof KanbanData)[]) {
      const task = displayData[status].find(t => t.id === id);
      if (task) return task;
    }
    return undefined;
  }, [displayData]);

  // Find which column a task is in
  const findColumn = useCallback((id: UniqueIdentifier): KanbanStatus | undefined => {
    if (!displayData) return undefined;
    for (const status of Object.keys(displayData) as KanbanStatus[]) {
      if (displayData[status].some(t => t.id === id)) {
        return status;
      }
    }
    return undefined;
  }, [displayData]);

  // Drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    // Copy server data to local state
    if (kanbanData) {
      setLocalKanban(JSON.parse(JSON.stringify(kanbanData)));
    }
  };

  // Drag over - handle column changes
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localKanban) return;

    const activeId = active.id;
    const overId = over.id;

    // Find columns
    const activeColumn = findColumn(activeId);
    const overColumn = columns.find(c => c.id === overId)?.id || findColumn(overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setLocalKanban((prev) => {
      if (!prev) return prev;
      
      // Remove from source
      const sourceItems = [...prev[activeColumn as keyof KanbanData]];
      const taskIndex = sourceItems.findIndex((t: Task) => t.id === activeId);
      if (taskIndex === -1) return prev;
      
      const [movedTask] = sourceItems.splice(taskIndex, 1);
      
      // Add to destination
      const destItems = [...prev[overColumn as keyof KanbanData]];
      const overIndex = destItems.findIndex((t: Task) => t.id === overId);
      
      // Insert at position
      if (overIndex === -1) {
        destItems.push({ ...movedTask, status: overColumn });
      } else {
        destItems.splice(overIndex, 0, { ...movedTask, status: overColumn });
      }

      return {
        ...prev,
        [activeColumn]: sourceItems,
        [overColumn]: destItems,
      };
    });
  };

  // Drag end - persist changes
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !localKanban) {
      setLocalKanban(null);
      return;
    }

    const activeColumn = findColumn(active.id);
    const overColumn = columns.find(c => c.id === over.id)?.id || findColumn(over.id);

    if (!activeColumn || !overColumn) {
      setLocalKanban(null);
      return;
    }

    const column = localKanban[overColumn as keyof KanbanData];
    const newIndex = column.findIndex((t: Task) => t.id === active.id);

    try {
      // If status changed, update status first
      if (activeColumn !== overColumn) {
        await updateStatus.mutateAsync({
          id: active.id as string,
          input: { status: overColumn }
        });
      }

      // Update position
      await updatePosition.mutateAsync({
        id: active.id as string,
        input: {
          status: overColumn,
          position: newIndex
        }
      });
    } catch (error) {
      console.error('Failed to update task position:', error);
    }

    // Clear local state
    setLocalKanban(null);
  };

  // Get active task for overlay
  const activeTask = activeId ? findTask(activeId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-500">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>Failed to load tasks</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto min-h-[calc(100vh-200px)]">
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            tasks={displayData?.[column.id] || []}
            onTaskClick={onTaskClick}
            onCreateTask={onCreateTask}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ============================================
// COLUMN COMPONENT
// ============================================

interface KanbanColumnComponentProps {
  column: KanbanColumn;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (status: KanbanStatus) => void;
}

function KanbanColumnComponent({ 
  column, 
  tasks, 
  onTaskClick, 
  onCreateTask 
}: KanbanColumnComponentProps) {
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

  return (
    <div className={cn(
      'flex flex-col w-80 min-w-[320px] rounded-xl border-t-4',
      column.color,
      column.bgColor
    )}>
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">{column.title}</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-gray-600 shadow-sm">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreateTask?.(column.id)}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            title="Add task"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
          <button className="p-1.5 hover:bg-white/50 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-2 overflow-y-auto">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SORTABLE TASK CARD
// ============================================

interface SortableTaskCardProps {
  task: Task;
  onClick?: () => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} isDragging={isDragging} onClick={onClick} />
    </div>
  );
}

// ============================================
// TASK CARD
// ============================================

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
}

function TaskCard({ task, isDragging, onClick }: TaskCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer',
        'hover:shadow-md hover:border-gray-300 transition-all',
        isDragging && 'shadow-lg ring-2 ring-blue-400 opacity-90'
      )}
    >
      {/* Priority Badge */}
      {task.priority && (
        <span className={cn(
          'inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2',
          priorityColors[task.priority] || priorityColors.MEDIUM
        )}>
          {task.priority}
        </span>
      )}

      {/* Title */}
      <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Meta Row */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {/* Comments */}
          {task.message_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.message_count}
            </span>
          )}
          {/* Attachments */}
          {task.attachment_count > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachment_count}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Due Date */}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          )}
          {/* Assignee Avatar */}
          {task.assignee && (
            <div 
              className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium"
              title={task.assignee.username}
            >
              {task.assignee.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KanbanBoard;
