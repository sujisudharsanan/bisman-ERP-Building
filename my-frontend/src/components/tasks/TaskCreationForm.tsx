/**
 * Task Creation Form Component
 * Chat-based task creation with live preview
 */

'use client';

import React, { useState, useRef } from 'react';
import { CreateTaskInput, TaskPriority } from '@/types/task';
import { useTaskAPI } from '@/hooks/useTaskAPI';
import { PriorityBadge } from './PriorityBadge';

interface TaskCreationFormProps {
  onTaskCreated?: (task: any) => void;
  onCancel?: () => void;
}

export const TaskCreationForm: React.FC<TaskCreationFormProps> = ({
  onTaskCreated,
  onCancel,
}) => {
  const { createTask, loading, error } = useTaskAPI();
  const [formData, setFormData] = useState<Partial<CreateTaskInput>>({
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assigneeId) {
      alert('Title and assignee are required');
      return;
    }

    const task = await createTask(formData as CreateTaskInput);
    
    if (task && onTaskCreated) {
      onTaskCreated(task);
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: TaskPriority.MEDIUM,
      });
      setFiles([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Create New Task
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter task title..."
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the task..."
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <div className="flex gap-2">
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'] as TaskPriority[]).map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setFormData({ ...formData, priority })}
                className={`
                  px-4 py-2 rounded-lg border transition-all
                  ${formData.priority === priority
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }
                `}
              >
                <PriorityBadge priority={priority} />
              </button>
            ))}
          </div>
        </div>

        {/* Assignee ID (temporary - will be replaced with user picker) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assignee ID *
          </label>
          <input
            type="number"
            value={formData.assigneeId || ''}
            onChange={(e) => setFormData({ ...formData, assigneeId: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter user ID..."
            required
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Due Date
          </label>
          <input
            type="date"
            value={formData.dueDate || ''}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attachments
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            📎 Choose Files
          </button>
          
          {files.length > 0 && (
            <div className="mt-2 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : '✓ Create Task'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
