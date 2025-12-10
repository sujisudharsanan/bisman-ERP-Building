/**
 * Task Creation Form Component
 * Chat-based task creation with live preview
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CreateTaskInput, TaskPriority } from '@/types/task';
import { useTaskAPI } from '@/hooks/useTaskAPI';
import { PriorityBadge } from './PriorityBadge';
import { Search, User, X, Loader2 } from 'lucide-react';

interface UserResult {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  profilePic: string | null;
}

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
  
  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users API call
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setUserSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value);
    setShowUserDropdown(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  // Select a user from dropdown
  const handleSelectUser = (user: UserResult) => {
    setSelectedUser(user);
    setFormData({ ...formData, assigneeId: user.id });
    setUserSearchQuery('');
    setShowUserDropdown(false);
    setUserSearchResults([]);
  };

  // Clear selected user
  const handleClearUser = () => {
    setSelectedUser(null);
    setFormData({ ...formData, assigneeId: undefined });
  };

  // Load initial users when dropdown opens
  const handleSearchFocus = () => {
    setShowUserDropdown(true);
    if (userSearchResults.length === 0 && !userSearchQuery) {
      searchUsers('');
    }
  };

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

        {/* Assignee - Searchable User Picker */}
        <div ref={userSearchRef}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assign To *
          </label>
          
          {/* Selected User Display */}
          {selectedUser ? (
            <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center gap-3">
                {selectedUser.profilePic ? (
                  <img 
                    src={selectedUser.profilePic} 
                    alt={selectedUser.fullName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedUser.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedUser.role} • {selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearUser}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            /* Search Input */
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => handleUserSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search users by name or email..."
              />
              
              {/* Dropdown Results */}
              {showUserDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  ) : userSearchResults.length > 0 ? (
                    userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        {user.profilePic ? (
                          <img 
                            src={user.profilePic} 
                            alt={user.fullName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-medium">
                              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role} • {user.email}</p>
                        </div>
                      </button>
                    ))
                  ) : userSearchQuery ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      No users found matching "{userSearchQuery}"
                    </div>
                  ) : (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Type to search for users...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
