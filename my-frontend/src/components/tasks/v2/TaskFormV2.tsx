/**
 * TaskFormV2 - Modern Task Creation/Edit Form
 * Clean, professional design with validation
 * Includes custom fields and recurring task options
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Flag,
  Paperclip,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle,
  Plus,
  Tag,
  Repeat,
  DollarSign,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskPriority, TaskStatus, CreateTaskInput, CustomField, RecurringFrequency, RecurringConfig } from '@/types/task';

// ============================================
// TYPES
// ============================================

interface UserOption {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string;
}

interface TaskFormV2Props {
  mode: 'create' | 'edit';
  task?: Task;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ============================================
// PRIORITY CONFIG
// ============================================

const priorityOptions: { value: TaskPriority; label: string; color: string; bgColor: string }[] = [
  { value: TaskPriority.LOW, label: 'Low', color: 'text-slate-600', bgColor: 'bg-slate-100 hover:bg-slate-200' },
  { value: TaskPriority.MEDIUM, label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100 hover:bg-blue-200' },
  { value: TaskPriority.HIGH, label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100 hover:bg-orange-200' },
  { value: TaskPriority.URGENT, label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100 hover:bg-red-200' },
  { value: TaskPriority.CRITICAL, label: 'Critical', color: 'text-purple-600', bgColor: 'bg-purple-100 hover:bg-purple-200' },
];

const recurringOptions: { value: RecurringFrequency; label: string }[] = [
  { value: RecurringFrequency.NONE, label: 'No Repeat' },
  { value: RecurringFrequency.DAILY, label: 'Daily' },
  { value: RecurringFrequency.WEEKLY, label: 'Weekly' },
  { value: RecurringFrequency.BIWEEKLY, label: 'Every 2 Weeks' },
  { value: RecurringFrequency.MONTHLY, label: 'Monthly' },
  { value: RecurringFrequency.QUARTERLY, label: 'Quarterly' },
  { value: RecurringFrequency.YEARLY, label: 'Yearly' },
];

const customFieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency (₹)' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Long Text' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function TaskFormV2({ mode, task, onSubmit, onCancel, isLoading = false }: TaskFormV2Props) {
  // Form state
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState(task?.dueDate?.split('T')[0] || '');
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours?.toString() || '');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text');
  const [showAdvanced, setShowAdvanced] = useState(true);
  const advancedRef = useRef<HTMLDivElement | null>(null);

  // Recurring task state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>(RecurringFrequency.NONE);
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [recurringTime, setRecurringTime] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [isExpense, setIsExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  // Assignee state
  const [assignee, setAssignee] = useState<UserOption | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load existing assignee
  useEffect(() => {
    if (task?.assignee) {
      setAssignee({
        id: task.assigneeId,
        username: task.assignee.username,
        email: task.assignee.email,
        fullName: `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim(),
        role: task.assignee.roleName || '',
        avatar: task.assignee.avatar,
      });
    }
  }, [task]);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setUserResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=8`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUserResults(data.users || []);
      }
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  // Debounced search
  const handleUserSearch = (value: string) => {
    setUserQuery(value);
    setShowUserDropdown(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchUsers(value), 250);
  };

  // Select user
  const selectUser = (user: UserOption) => {
    setAssignee(user);
    setUserQuery('');
    setShowUserDropdown(false);
    setUserResults([]);
    setErrors({ ...errors, assignee: '' });
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!assignee) {
      newErrors.assignee = 'Please assign this task to someone';
    }

    if (dueDate && new Date(dueDate) < new Date(new Date().toDateString())) {
      newErrors.dueDate = 'Due date cannot be in the past';
    }

    if (estimatedHours && (isNaN(Number(estimatedHours)) || Number(estimatedHours) < 0)) {
      newErrors.estimatedHours = 'Please enter a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, assignee: true, dueDate: true });

    if (!validate()) return;

    // Build recurring config if enabled
    let recurring: RecurringConfig | undefined;
    if (isRecurring && recurringFrequency !== RecurringFrequency.NONE) {
      recurring = {
        frequency: recurringFrequency,
        startDate: recurringStartDate,
        endDate: recurringEndDate || undefined,
        time: recurringTime,
        dayOfWeek: recurringFrequency === RecurringFrequency.WEEKLY ? dayOfWeek : undefined,
        dayOfMonth: recurringFrequency === RecurringFrequency.MONTHLY ? dayOfMonth : undefined,
        autoAssign: true,
        isExpense: isExpense,
        expenseAmount: isExpense && expenseAmount ? Number(expenseAmount) : undefined,
        expenseCategory: isExpense ? expenseCategory : undefined,
      };
    }

    const data: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigneeId: assignee!.id,
      dueDate: dueDate || undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      customFields: customFields.length > 0 ? customFields : undefined,
      recurring,
    };

    await onSubmit(data);
  };

  // Add tag
  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Add custom field
  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      value: '',
      required: false,
    };
    setCustomFields([...customFields, newField]);
    setNewFieldLabel('');
    setNewFieldType('text');
    setShowAddField(false);
  };

  // Update custom field value
  const updateCustomFieldValue = (fieldId: string, value: string) => {
    setCustomFields(customFields.map(f => 
      f.id === fieldId ? { ...f, value } : f
    ));
  };

  // Remove custom field
  const removeCustomField = (fieldId: string) => {
    setCustomFields(customFields.filter(f => f.id !== fieldId));
  };

  // Toggle recurring task
  const handleRecurringToggle = (enabled: boolean) => {
    setIsRecurring(enabled);
    if (!enabled) {
      setRecurringFrequency(RecurringFrequency.NONE);
    } else {
      setRecurringFrequency(RecurringFrequency.WEEKLY);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Create New Task' : 'Edit Task'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {mode === 'create' ? 'Fill in the details below' : `Editing: ${task?.unique_id || ''}`}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTouched({ ...touched, title: true })}
                placeholder="What needs to be done?"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800',
                  'text-gray-900 dark:text-white placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'transition-all duration-200',
                  touched.title && errors.title
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                )}
              />
              {touched.title && errors.title && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about this task..."
                rows={4}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800',
                  'text-gray-900 dark:text-white placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'border-gray-200 dark:border-gray-700 resize-none',
                  'transition-all duration-200'
                )}
              />
            </div>

            {/* Priority & Due Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Flag className="w-4 h-4 inline mr-1" />
                  Priority
                </label>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                        priority === opt.value
                          ? `${opt.bgColor} ${opt.color} ring-2 ring-offset-1 ring-current`
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={() => setTouched({ ...touched, dueDate: true })}
                  min={new Date().toISOString().split('T')[0]}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800',
                    'text-gray-900 dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    touched.dueDate && errors.dueDate
                      ? 'border-red-300'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                />
                {touched.dueDate && errors.dueDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.dueDate}</p>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div ref={userSearchRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assign To <span className="text-red-500">*</span>
              </label>

              {assignee ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {assignee.fullName?.charAt(0) || assignee.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {assignee.fullName || assignee.username}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {assignee.role} • {assignee.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignee(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    {searchingUsers ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Search by name or email..."
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      touched.assignee && errors.assignee
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  />

                  {/* Dropdown */}
                  {showUserDropdown && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {searchingUsers ? (
                        <div className="p-4 text-center text-gray-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                          <span className="text-sm">Searching...</span>
                        </div>
                      ) : userResults.length > 0 ? (
                        <div className="py-2">
                          {userResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => selectUser(user)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                {user.fullName?.charAt(0) || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {user.fullName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {user.role} • {user.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : userQuery ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No users found for "{userQuery}"
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Start typing to search users...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {touched.assignee && errors.assignee && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.assignee}
                </p>
              )}
            </div>

            {/* Estimated Hours & Tags Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g., 4"
                  min="0"
                  step="0.5"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800',
                    'text-gray-900 dark:text-white placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'border-gray-200 dark:border-gray-700'
                  )}
                />
                {/* Quick link to advanced options to help users find custom fields / recurring settings */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvanced(true);
                      setTimeout(() => advancedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
                  >
                    <GripVertical className="w-4 h-4" />
                    More options
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    className={cn(
                      'flex-1 px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      'border-gray-200 dark:border-gray-700'
                    )}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields Section */}
            <div ref={advancedRef} id="advanced-options" className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <GripVertical className="w-4 h-4 inline mr-1" />
                  Custom Input Fields
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddField(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>

              {/* Add New Field Form */}
              {showAddField && (
                <div className="mb-4 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add New Input Field</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      placeholder="Field label (e.g., Invoice Number)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    />
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as CustomField['type'])}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    >
                      {customFieldTypes.map(ft => (
                        <option key={ft.value} value={ft.value}>{ft.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={addCustomField}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddField(false)}
                      className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Fields List */}
              {customFields.length > 0 && (
                <div className="space-y-3">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {field.label}
                          <span className="ml-2 text-xs text-gray-400">({field.type})</span>
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={field.value}
                            onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none"
                          />
                        ) : field.type === 'currency' ? (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                            <input
                              type="number"
                              value={field.value}
                              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                            />
                          </div>
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            value={field.value}
                            onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-6"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring Task Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Repeat className="w-4 h-4 inline mr-1" />
                  Recurring Task / Expense
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => handleRecurringToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-4 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frequency
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {recurringOptions.filter(o => o.value !== RecurringFrequency.NONE).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRecurringFrequency(opt.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            recurringFrequency === opt.value
                              ? 'bg-green-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date/Time Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={recurringStartDate}
                        onChange={(e) => setRecurringStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date (Optional)</label>
                      <input
                        type="date"
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        min={recurringStartDate}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Time</label>
                      <input
                        type="time"
                        value={recurringTime}
                        onChange={(e) => setRecurringTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      />
                    </div>
                  </div>

                  {/* Weekly Day Selector */}
                  {recurringFrequency === RecurringFrequency.WEEKLY && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Day of Week</label>
                      <div className="flex gap-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setDayOfWeek(idx)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                              dayOfWeek === idx
                                ? 'bg-green-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly Day Selector */}
                  {recurringFrequency === RecurringFrequency.MONTHLY && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Day of Month</label>
                      <select
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Expense Toggle */}
                  <div className="border-t border-green-200 dark:border-green-700 pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="isExpense"
                        checked={isExpense}
                        onChange={(e) => setIsExpense(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label htmlFor="isExpense" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        This is a recurring expense
                      </label>
                    </div>

                    {isExpense && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount (₹)</label>
                          <input
                            type="number"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
                          <select
                            value={expenseCategory}
                            onChange={(e) => setExpenseCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          >
                            <option value="">Select category...</option>
                            <option value="rent">Rent</option>
                            <option value="salary">Salary</option>
                            <option value="utilities">Utilities</option>
                            <option value="subscription">Subscription</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="insurance">Insurance</option>
                            <option value="taxes">Taxes</option>
                            <option value="marketing">Marketing</option>
                            <option value="supplies">Supplies</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Paperclip className="w-4 h-4 inline mr-1" />
                Attachments
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Paperclip className="w-6 h-6 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">Click to upload or drag and drop</p>
                  </div>
                  <input type="file" className="hidden" multiple />
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'px-6 py-2.5 rounded-xl font-medium transition-all duration-200',
                'bg-blue-600 hover:bg-blue-700 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {mode === 'create' ? 'Create Task' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskFormV2;
