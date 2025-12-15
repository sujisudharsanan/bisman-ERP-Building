'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight,
  Plus,
  Settings,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Target,
  ListTodo,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Types
interface TaskDeadline {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string;
  assignee_name?: string;
  creator_name?: string;
}

interface DaySchedule {
  date: Date;
  dayNumber: number;
  dayName: string;
  tasks: TaskDeadline[];
}

// Priority colors
const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600',
  MEDIUM: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  HIGH: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  URGENT: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
};

const priorityBadgeColors: Record<string, string> = {
  LOW: 'bg-gray-500 text-white',
  MEDIUM: 'bg-blue-500 text-white',
  HIGH: 'bg-orange-500 text-white',
  URGENT: 'bg-red-500 text-white',
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  ASSIGNED: Target,
  IN_PROGRESS: Clock,
  IN_REVIEW: AlertTriangle,
  DONE: CheckCircle2,
  COMPLETED: CheckCircle2,
};

export default function ModernCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskDeadline | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Fetch tasks with due dates
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        // Get tasks for a range (3 weeks before and after current week)
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 21);
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 21);
        
        const response = await fetch('/api/tasks?limit=100', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          const taskList = data.data || data.tasks || data || [];
          
          // Filter tasks that have due dates
          const tasksWithDueDates = taskList.filter((t: any) => t.due_date || t.dueDate);
          setTasks(tasksWithDueDates.map((t: any) => ({
            id: String(t.id),
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority || 'MEDIUM',
            due_date: t.due_date || t.dueDate,
            assignee_name: t.assignee_name || t.assignee?.username || t.assignee?.firstName,
            creator_name: t.creator_name || t.creator?.username || t.creator?.firstName,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentDate]);

  // Generate all days in current month with tasks
  const getMonthDays = (): DaySchedule[] => {
    const days: DaySchedule[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and last day of month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on the Saturday of the week containing the last day
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    // Generate all days
    const current = new Date(startDate);
    while (current <= endDate) {
      // Get tasks due on this day
      const dayTasks = tasks.filter(task => {
        const taskDue = new Date(task.due_date);
        return taskDue.toDateString() === current.toDateString();
      });
      
      days.push({
        date: new Date(current),
        dayNumber: current.getDate(),
        dayName: current.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        tasks: dayTasks,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const monthDays = getMonthDays();

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDue = (dueDate: string, status: string) => {
    if (['DONE', 'COMPLETED', 'CANCELLED'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="h-full bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Back Button + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-2">
                <ListTodo className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Task Deadlines
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {getMonthYear()}
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Month Navigation */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
                {getMonthYear()}
              </span>

              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Right: Today Button */}
            <div className="flex items-center gap-2">
              <button 
                onClick={goToToday}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              <ListTodo className="w-3 h-3" />
              {tasks.length} tasks with deadlines
            </span>
            {tasks.filter(t => isPastDue(t.due_date, t.status)).length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {tasks.filter(t => isPastDue(t.due_date, t.status)).length} overdue
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Monthly Calendar Grid */}
        {!loading && (
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day, dayIndex) => {
                const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
                const hasOverdueTasks = day.tasks.some(t => isPastDue(t.due_date, t.status));
                
                return (
                  <div
                    key={dayIndex}
                    className={`min-h-[100px] sm:min-h-[120px] p-2 rounded-lg border transition-all ${
                      isToday(day.date)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : isCurrentMonth
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50'
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${
                        isToday(day.date)
                          ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                          : isCurrentMonth
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {day.dayNumber}
                      </span>
                      {day.tasks.length > 0 && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          hasOverdueTasks 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          {day.tasks.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Tasks List */}
                    <div className="space-y-1 overflow-hidden">
                      {day.tasks.slice(0, 3).map((task) => {
                        const isOverdue = isPastDue(task.due_date, task.status);
                        const isCompleted = ['DONE', 'COMPLETED'].includes(task.status);
                        
                        return (
                          <div
                            key={task.id}
                            onClick={() => {
                              setSelectedTask(task);
                              setShowTaskModal(true);
                            }}
                            className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-all hover:opacity-80 ${
                              isCompleted
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 line-through'
                                : isOverdue
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : task.priority === 'URGENT'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    : task.priority === 'HIGH'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            {task.title}
                          </div>
                        );
                      })}
                      {day.tasks.length > 3 && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                          +{day.tasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        {showTaskModal && selectedTask && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTaskModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Task Details</h3>
                  <button 
                    onClick={() => setShowTaskModal(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTask.title}</h4>
                  {selectedTask.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedTask.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${priorityBadgeColors[selectedTask.priority]}`}>
                    {selectedTask.priority}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    ['DONE', 'COMPLETED'].includes(selectedTask.status)
                      ? 'bg-green-100 text-green-700'
                      : isPastDue(selectedTask.due_date, selectedTask.status)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedTask.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Due:</strong> {new Date(selectedTask.due_date).toLocaleString()}</p>
                  {selectedTask.assignee_name && <p><strong>Assignee:</strong> {selectedTask.assignee_name}</p>}
                  {selectedTask.creator_name && <p><strong>Creator:</strong> {selectedTask.creator_name}</p>}
                </div>
                <a 
                  href={`/tasks?id=${selectedTask.id}`}
                  className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Open Task
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}