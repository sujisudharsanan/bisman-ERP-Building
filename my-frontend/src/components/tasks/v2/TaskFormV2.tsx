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
  Building2,
  CreditCard,
  Receipt,
  FileText,
  GripVertical,
  UserPlus,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { VendorCreationModal } from '../../vendors/VendorCreationModal';
import { VendorSearchResult } from '@/types/vendor';
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
  const [dueTime, setDueTime] = useState(task?.dueDate ? task.dueDate.split('T')[1]?.slice(0, 5) || '18:00' : '18:00');
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

  // Tab state: 'task' or 'payment'
  const [activeTab, setActiveTab] = useState<'task' | 'payment'>('task');

  // Payment Request specific state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('INR');
  const [paymentCategory, setPaymentCategory] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Vendor/Beneficiary selection state
  const [selectedVendor, setSelectedVendor] = useState<VendorSearchResult | null>(null);
  const [vendorQuery, setVendorQuery] = useState('');
  const [vendorResults, setVendorResults] = useState<VendorSearchResult[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [searchingVendors, setSearchingVendors] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [isFirstTimeVendor, setIsFirstTimeVendor] = useState(false);
  const [hasSupportingDocument, setHasSupportingDocument] = useState<boolean | null>(null);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const vendorSearchTimeout = useRef<NodeJS.Timeout>();

  // Assignees state (multiple)
  const [assignees, setAssignees] = useState<UserOption[]>([]);
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

  // Auto-set due date and time based on priority
  useEffect(() => {
    if (mode === 'edit') return; // Don't auto-change for edit mode
    
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    switch (priority) {
      case TaskPriority.CRITICAL:
        // Critical: Due in 2 hours or end of today
        setDueDate(formatDate(today));
        const criticalHour = Math.min(today.getHours() + 2, 23);
        setDueTime(`${criticalHour.toString().padStart(2, '0')}:00`);
        break;
      case TaskPriority.URGENT:
        // Urgent: Due end of today
        setDueDate(formatDate(today));
        setDueTime('18:00');
        break;
      case TaskPriority.HIGH:
        // High: Due tomorrow end of day
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDueDate(formatDate(tomorrow));
        setDueTime('18:00');
        break;
      case TaskPriority.MEDIUM:
        // Medium: Due in 3 days
        const threeDays = new Date(today);
        threeDays.setDate(threeDays.getDate() + 3);
        setDueDate(formatDate(threeDays));
        setDueTime('18:00');
        break;
      case TaskPriority.LOW:
        // Low: Due in 7 days
        const sevenDays = new Date(today);
        sevenDays.setDate(sevenDays.getDate() + 7);
        setDueDate(formatDate(sevenDays));
        setDueTime('18:00');
        break;
    }
  }, [priority, mode]);

  // Load existing assignees
  useEffect(() => {
    if (task?.assignee) {
      setAssignees([{
        id: task.assigneeId,
        username: task.assignee.username,
        email: task.assignee.email,
        fullName: `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim(),
        role: task.assignee.roleName || '',
        avatar: task.assignee.avatar,
      }]);
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

  // Select user (add to assignees list)
  const selectUser = (user: UserOption) => {
    // Don't add if already in list
    if (assignees.some(a => a.id === user.id)) return;
    setAssignees([...assignees, user]);
    setUserQuery('');
    setShowUserDropdown(false);
    setUserResults([]);
    setErrors({ ...errors, assignee: '' });
  };

  // Remove user from assignees
  const removeAssignee = (userId: number) => {
    setAssignees(assignees.filter(a => a.id !== userId));
  };

  // Search vendors for beneficiary autocomplete
  const searchVendors = useCallback(async (query: string) => {
    if (query.length < 2) {
      setVendorResults([]);
      return;
    }

    setSearchingVendors(true);
    try {
      const res = await fetch(`/api/vendors/search?q=${encodeURIComponent(query)}&limit=10`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setVendorResults(data.data || []);
      }
    } catch (err) {
      console.error('Vendor search error:', err);
    } finally {
      setSearchingVendors(false);
    }
  }, []);

  // Debounced vendor search
  const handleVendorSearch = (value: string) => {
    setVendorQuery(value);
    setBeneficiaryName(value);
    setShowVendorDropdown(true);
    setSelectedVendor(null);
    if (vendorSearchTimeout.current) clearTimeout(vendorSearchTimeout.current);
    vendorSearchTimeout.current = setTimeout(() => searchVendors(value), 300);
  };

  // Select vendor and auto-fill bank details
  const selectVendor = (vendor: VendorSearchResult) => {
    setSelectedVendor(vendor);
    setBeneficiaryName(vendor.full_name);
    setAccountNumber(vendor.account_number);
    setBankName(vendor.bank_name);
    setIfscCode(vendor.ifsc_code);
    setVendorQuery('');
    setShowVendorDropdown(false);
    setVendorResults([]);
    setIsFirstTimeVendor(false);
    setHasSupportingDocument(null);
  };

  // Clear selected vendor
  const clearSelectedVendor = () => {
    setSelectedVendor(null);
    setBeneficiaryName('');
    setAccountNumber('');
    setBankName('');
    setIfscCode('');
    setBranchName('');
    setIsFirstTimeVendor(false);
    setHasSupportingDocument(null);
  };

  // Handle vendor creation from modal
  const handleVendorCreated = (vendor: any) => {
    setSelectedVendor({
      id: vendor.id,
      full_name: vendor.full_name,
      business_name: vendor.business_name,
      role_type: vendor.role_type,
      bank_name: vendor.bank_name,
      account_number: vendor.account_number,
      ifsc_code: vendor.ifsc_code,
      pan_number: vendor.pan_number,
      contact_number: vendor.contact_number,
      email: vendor.email,
      status: vendor.status,
    });
    setBeneficiaryName(vendor.full_name);
    setAccountNumber(vendor.account_number);
    setBankName(vendor.bank_name);
    setIfscCode(vendor.ifsc_code);
    setIsFirstTimeVendor(true);
    setShowVendorModal(false);
  };

  // Click outside handler for vendor dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(e.target as Node)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = activeTab === 'payment' ? 'Request title is required' : 'Title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (assignees.length === 0) {
      newErrors.assignee = activeTab === 'payment' ? 'Please assign an approver' : 'Please assign this task to at least one person';
    }

    // Payment-specific validation
    if (activeTab === 'payment') {
      if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
        newErrors.paymentAmount = 'Please enter a valid amount';
      }
      // First-time vendor document check
      if (isFirstTimeVendor && hasSupportingDocument === false) {
        newErrors.supportingDocument = 'Supporting document is required for first-time vendors';
      }
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
    setTouched({ title: true, assignee: true, dueDate: true, paymentAmount: true });

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

    // Build payment request data if payment tab is active
    const paymentRequest = activeTab === 'payment' ? {
      amount: Number(paymentAmount),
      currency: paymentCurrency,
      category: paymentCategory || undefined,
      invoiceNumber: invoiceNumber || undefined,
      beneficiaryName: beneficiaryName || undefined,
      accountNumber: accountNumber || undefined,
      bankName: bankName || undefined,
      notes: paymentNotes || undefined,
    } : undefined;

    const data: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigneeId: assignees[0]?.id, // Primary assignee (first in list)
      assigneeIds: assignees.map(a => a.id), // All assignees
      dueDate: dueDate ? `${dueDate}T${dueTime || '18:00'}:00` : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      customFields: customFields.length > 0 ? customFields : undefined,
      recurring,
      // Payment request specific fields
      taskType: activeTab === 'payment' ? 'PAYMENT_REQUEST' : 'TASK',
      paymentRequest,
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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {mode === 'create' ? (activeTab === 'payment' ? 'Create Payment Request' : 'Create New Task') : 'Edit Task'}
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
          
          {/* Tabs - Only show in create mode */}
          {mode === 'create' && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setActiveTab('task')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  activeTab === 'task'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <FileText className="w-4 h-4" />
                Task
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payment')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  activeTab === 'payment'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <CreditCard className="w-4 h-4" />
                Payment Request
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {activeTab === 'payment' ? 'Request Title' : 'Task Title'} <span className="text-red-500">*</span>
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

            {/* Payment Request Specific Fields */}
            {activeTab === 'payment' && (
              <>
                {/* Amount and Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      onBlur={() => setTouched({ ...touched, paymentAmount: true })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'border-gray-200 dark:border-gray-700',
                        'transition-all duration-200'
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Currency
                    </label>
                    <select
                      value={paymentCurrency}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800',
                        'text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'border-gray-200 dark:border-gray-700',
                        'transition-all duration-200'
                      )}
                    >
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                  </div>
                </div>

                {/* Category and Invoice */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Category
                    </label>
                    <select
                      value={paymentCategory}
                      onChange={(e) => setPaymentCategory(e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800',
                        'text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'border-gray-200 dark:border-gray-700',
                        'transition-all duration-200'
                      )}
                    >
                      <option value="">Select category...</option>
                      <option value="vendor">Vendor Payment</option>
                      <option value="salary">Salary</option>
                      <option value="utilities">Utilities</option>
                      <option value="rent">Rent</option>
                      <option value="supplies">Office Supplies</option>
                      <option value="travel">Travel & Expenses</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Receipt className="w-4 h-4 inline mr-1" />
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-001"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'border-gray-200 dark:border-gray-700',
                        'transition-all duration-200'
                      )}
                    />
                  </div>
                </div>

                {/* Beneficiary Details */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Beneficiary Details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowVendorModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add New Vendor
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Beneficiary Name with Autocomplete */}
                    <div ref={vendorSearchRef} className="relative">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Beneficiary Name <span className="text-red-500">*</span>
                      </label>
                      {selectedVendor ? (
                        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-gray-900 dark:text-white font-medium">{selectedVendor.full_name}</span>
                            {selectedVendor.business_name && (
                              <span className="text-xs text-gray-500">({selectedVendor.business_name})</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={clearSelectedVendor}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={beneficiaryName}
                              onChange={(e) => handleVendorSearch(e.target.value)}
                              onFocus={() => beneficiaryName.length >= 2 && setShowVendorDropdown(true)}
                              placeholder="Search existing vendor or enter name..."
                              className={cn(
                                'w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                                'text-gray-900 dark:text-white placeholder:text-gray-400',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                'border-gray-200 dark:border-gray-600',
                                'transition-all duration-200'
                              )}
                            />
                            {searchingVendors && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                            )}
                          </div>
                          
                          {/* Vendor Search Dropdown */}
                          {showVendorDropdown && (vendorResults.length > 0 || beneficiaryName.length >= 2) && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {vendorResults.length > 0 ? (
                                vendorResults.map(vendor => (
                                  <button
                                    key={vendor.id}
                                    type="button"
                                    onClick={() => selectVendor(vendor)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.full_name}</p>
                                        {vendor.business_name && (
                                          <p className="text-xs text-gray-500">{vendor.business_name}</p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-500">{vendor.bank_name}</p>
                                        <p className="text-xs font-mono text-gray-400">...{vendor.account_number.slice(-4)}</p>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center">
                                  <p className="text-sm text-gray-500 mb-2">No matching vendors found</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowVendorDropdown(false);
                                      setShowVendorModal(true);
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    Create new vendor
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Account Number and IFSC */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Enter account number"
                          readOnly={!!selectedVendor}
                          className={cn(
                            'w-full px-4 py-2.5 rounded-lg border',
                            selectedVendor 
                              ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300' 
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                            'placeholder:text-gray-400',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                            'border-gray-200 dark:border-gray-600',
                            'transition-all duration-200'
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          placeholder="e.g., HDFC0001234"
                          readOnly={!!selectedVendor}
                          className={cn(
                            'w-full px-4 py-2.5 rounded-lg border uppercase',
                            selectedVendor 
                              ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300' 
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                            'placeholder:text-gray-400',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                            'border-gray-200 dark:border-gray-600',
                            'transition-all duration-200'
                          )}
                        />
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Enter bank name"
                        readOnly={!!selectedVendor}
                        className={cn(
                          'w-full px-4 py-2.5 rounded-lg border',
                          selectedVendor 
                            ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                          'placeholder:text-gray-400',
                          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                          'border-gray-200 dark:border-gray-600',
                          'transition-all duration-200'
                        )}
                      />
                    </div>

                    {/* First-time vendor warning */}
                    {(isFirstTimeVendor || (!selectedVendor && beneficiaryName.length > 0 && accountNumber.length > 0)) && (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                              First-time vendor - Supporting document required
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                              Without proof (cancelled cheque, passbook, or bank statement), this payment request may be rejected.
                            </p>
                            
                            <div className="mt-3 flex gap-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="hasSupportingDoc"
                                  checked={hasSupportingDocument === true}
                                  onChange={() => setHasSupportingDocument(true)}
                                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Yes, I have proof</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="hasSupportingDoc"
                                  checked={hasSupportingDocument === false}
                                  onChange={() => setHasSupportingDocument(false)}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">No proof available</span>
                              </label>
                            </div>
                            
                            {hasSupportingDocument === false && (
                              <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Payment may be rejected without supporting documents
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Additional Notes
                      </label>
                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Any additional payment instructions..."
                        rows={2}
                        className={cn(
                          'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                          'text-gray-900 dark:text-white placeholder:text-gray-400',
                          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                          'border-gray-200 dark:border-gray-600 resize-none',
                          'transition-all duration-200'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Custom Fields Section - Only for Task tab */}
            {activeTab === 'task' && (
            <div ref={advancedRef} id="advanced-options" className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center justify-between mb-3">
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
                    <div key={field.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm resize-none"
                          />
                        ) : field.type === 'currency' ? (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                            <input
                              type="number"
                              value={field.value}
                              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                            />
                          </div>
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            value={field.value}
                            onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
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

              {customFields.length === 0 && !showAddField && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                  No custom fields added. Click "Add Field" to create one.
                </p>
              )}
            </div>
            )}

            {/* Priority & Due Date Row - Only for Task tab */}
            {activeTab === 'task' && (
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

              {/* Due Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Due Date & Time
                  <span className="ml-2 text-xs text-gray-400">(auto-set by priority)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    onBlur={() => setTouched({ ...touched, dueDate: true })}
                    min={new Date().toISOString().split('T')[0]}
                    className={cn(
                      'flex-1 px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800',
                      'text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      touched.dueDate && errors.dueDate
                        ? 'border-red-300'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  />
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className={cn(
                        'w-28 pl-9 pr-3 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800',
                        'text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'border-gray-200 dark:border-gray-700'
                      )}
                    />
                  </div>
                </div>
                {touched.dueDate && errors.dueDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.dueDate}</p>
                )}
              </div>
            </div>
            )}

            {/* Assignees (Multiple) - Only for Task tab */}
            {activeTab === 'task' && (
            <div ref={userSearchRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assign To <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-400 font-normal">(Add multiple people)</span>
              </label>

              {/* Selected Assignees Chips */}
              {assignees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {assignees.map((user) => (
                    <div
                      key={user.id}
                      className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                        {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
                      </div>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        {user.fullName || user.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAssignee(user.id)}
                        className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Input */}
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
                  placeholder={assignees.length > 0 ? "Add another person..." : "Search by name or email..."}
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
                        {userResults.map((user) => {
                          const alreadyAdded = assignees.some(a => a.id === user.id);
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => selectUser(user)}
                              disabled={alreadyAdded}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                                alreadyAdded 
                                  ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
                              )}
                            >
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                {user.fullName?.charAt(0) || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {user.fullName}
                                  {alreadyAdded && <span className="ml-2 text-xs text-green-600">(Added)</span>}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {user.role} • {user.email}
                                </p>
                              </div>
                            </button>
                          );
                        })}
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

              {touched.assignee && errors.assignee && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.assignee}
                </p>
              )}
            </div>
            )}

            {/* Estimated Hours & Tags Row - Only for Task tab */}
            {activeTab === 'task' && (
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
            )}

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
                  {mode === 'create' ? (activeTab === 'payment' ? 'Submitting...' : 'Creating...') : 'Saving...'}
                </>
              ) : (
                <>
                  {activeTab === 'payment' ? <CreditCard className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {mode === 'create' ? (activeTab === 'payment' ? 'Submit Payment Request' : 'Create Task') : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Vendor Creation Modal */}
      <VendorCreationModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        onVendorCreated={handleVendorCreated}
      />
    </div>
  );
}

export default TaskFormV2;
