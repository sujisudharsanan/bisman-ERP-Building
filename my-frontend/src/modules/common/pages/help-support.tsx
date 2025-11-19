'use client';

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Paperclip,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Tag,
  Activity,
  Download,
  Trash2,
  Edit3,
} from 'lucide-react';
import { uploadFiles } from '@/lib/attachments';
import { useAuth } from '@/common/hooks/useAuth';

// Types
interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  module: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name?: string;
  assigned_to?: string;
  system_info?: {
    browser: string;
    device: string;
    erp_version: string;
    os: string;
    user_id?: string;
    hub_id?: string;
    timestamp?: string;
  };
  attachments?: AttachmentFile[];
  comments?: Comment[];
  activity_log?: ActivityLog[];
}

interface AttachmentFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
}

interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
  attachments?: AttachmentFile[];
}

interface ActivityLog {
  id: string;
  ticket_id: string;
  action: string;
  details: string;
  created_at: string;
  user_name: string;
}

interface ToastMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function HelpSupportPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    category: '',
    module: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [postingComment, setPostingComment] = useState(false);

  // Categories and modules
  const categories = [
    { value: 'login_access', label: 'Login / Access issue' },
    { value: 'data_mismatch', label: 'Data mismatch' },
    { value: 'payment_billing', label: 'Payment / Billing' },
    { value: 'approvals_workflow', label: 'Approvals & Workflow' },
    { value: 'ai_assistant', label: 'AI Assistant / Chat' },
    { value: 'calendar_scheduling', label: 'Calendar & Scheduling' },
    { value: 'erp_performance', label: 'ERP performance / lag' },
    { value: 'request_feature', label: 'Request new feature' },
    { value: 'others', label: 'Others' },
  ];

  const modules = [
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'HR' },
    { value: 'logistics_hub', label: 'Logistics / Hub operations' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'vendor_management', label: 'Vendor management' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'user_settings', label: 'User settings' },
    { value: 'chat_ai', label: 'Chat / AI' },
  ];

  // Collect system information
  const getSystemInfo = () => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
    else if (userAgent.indexOf('Edge') > -1) browser = 'Edge';

    // Detect OS
    if (userAgent.indexOf('Win') > -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
    else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
    else if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iOS') > -1) os = 'iOS';

    return {
      browser,
      device: /Mobile|Tablet/.test(userAgent) ? 'Mobile/Tablet' : 'Desktop',
      erp_version: '2.0.1',
      os,
      user_id: user?.id || '',
      hub_id: (user as any)?.hub_id || '',
      timestamp: new Date().toISOString(),
    };
  };

  // Fetch tickets
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/support/tickets', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setFilteredTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      showToast('error', 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Filter tickets
  useEffect(() => {
    let filtered = tickets;

    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    if (moduleFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.module === moduleFilter);
    }

    setFilteredTickets(filtered);
  }, [searchQuery, statusFilter, moduleFilter, tickets]);

  // Show toast notification
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isComment = false) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (isComment) {
        setCommentAttachments((prev) => [...prev, ...files]);
      } else {
        setAttachments((prev) => [...prev, ...files]);
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index: number, isComment = false) => {
    if (isComment) {
      setCommentAttachments((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.category) errors.category = 'Please select a category';
    if (!formData.module) errors.module = 'Please select a module';
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (formData.description.trim().length < 20)
      errors.description = 'Please provide more details (minimum 20 characters)';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit new ticket
  const handleSubmitTicket = async () => {
    if (!validateForm()) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // Upload attachments first
      let uploadedFiles: any[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        const uploaded = await uploadFiles(attachments, 'ticket', 'pending');
        uploadedFiles = uploaded || [];
        setUploading(false);
      }

      const systemInfo = getSystemInfo();

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          system_info: systemInfo,
          attachments: uploadedFiles,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast('success', 'Ticket submitted successfully! Ticket #' + data.ticket.ticket_number);
        setFormData({
          category: '',
          module: '',
          title: '',
          description: '',
          priority: 'medium',
        });
        setAttachments([]);
        setActiveView('list');
        fetchTickets();
      } else {
        throw new Error('Failed to submit ticket');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      showToast('error', 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // View ticket details
  const handleViewTicket = async (ticketId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.ticket);
        setActiveView('detail');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      showToast('error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  // Post comment
  const handlePostComment = async () => {
    if (!newComment.trim() && commentAttachments.length === 0) {
      showToast('error', 'Please enter a message or attach a file');
      return;
    }

    setPostingComment(true);

    try {
      // Upload comment attachments
      let uploadedFiles: any[] = [];
      if (commentAttachments.length > 0) {
        const uploaded = await uploadFiles(commentAttachments, 'ticket_comment', selectedTicket?.id || '');
        uploadedFiles = uploaded || [];
      }

      const response = await fetch(`/api/support/tickets/${selectedTicket?.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: newComment,
          attachments: uploadedFiles,
        }),
      });

      if (response.ok) {
        showToast('success', 'Comment posted successfully');
        setNewComment('');
        setCommentAttachments([]);
        // Refresh ticket details
        if (selectedTicket) {
          handleViewTicket(selectedTicket.id);
        }
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      showToast('error', 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      waiting_user: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || styles.open;
  };

  // Get priority badge style
  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
              <p className="text-sm text-gray-600">Submit tickets and track your support requests</p>
            </div>
          </div>

          {activeView === 'list' && (
            <button
              onClick={() => setActiveView('create')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Ticket</span>
            </button>
          )}

          {activeView !== 'list' && (
            <button
              onClick={() => {
                setActiveView('list');
                setSelectedTicket(null);
                setFormData({
                  category: '',
                  module: '',
                  title: '',
                  description: '',
                  priority: 'medium',
                });
                setAttachments([]);
                setFormErrors({});
              }}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>← Back to Tickets</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* MY TICKETS LIST VIEW */}
        {activeView === 'list' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_user">Waiting for User</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Module Filter */}
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="all">All Modules</option>
                    {modules.map((mod) => (
                      <option key={mod.value} value={mod.value}>
                        {mod.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery || statusFilter !== 'all' || moduleFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first support ticket to get started'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && moduleFilter === 'all' && (
                    <button
                      onClick={() => setActiveView('create')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create New Ticket</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ticket #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Module
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(ticket.status)}
                              <span className="ml-2 text-sm font-medium text-gray-900">
                                {ticket.ticket_number}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {ticket.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600 capitalize">
                              {ticket.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600 capitalize">
                              {modules.find((m) => m.value === ticket.module)?.label || ticket.module}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityBadge(
                                ticket.priority
                              )}`}
                            >
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(
                                ticket.status
                              )}`}
                            >
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(ticket.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleViewTicket(ticket.id)}
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE NEW TICKET VIEW */}
        {activeView === 'create' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Support Ticket</h2>

            <div className="space-y-6">
              {/* Category and Module */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 border ${
                      formErrors.category ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select a category...</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module / Area Affected <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    className={`w-full px-3 py-2 border ${
                      formErrors.module ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select a module...</option>
                    {modules.map((mod) => (
                      <option key={mod.value} value={mod.value}>
                        {mod.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.module && <p className="mt-1 text-sm text-red-500">{formErrors.module}</p>}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title of Issue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of your issue..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border ${
                    formErrors.title ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {formErrors.title && <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Please provide detailed information about the issue, including steps to reproduce if applicable..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className={`w-full px-3 py-2 border ${
                    formErrors.description ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.description && (
                    <p className="text-sm text-red-500">{formErrors.description}</p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {formData.description.length} characters
                  </p>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['low', 'medium', 'high', 'critical'].map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          priority: priority as 'low' | 'medium' | 'high' | 'critical',
                        })
                      }
                      className={`px-4 py-2 rounded-lg border-2 font-medium capitalize transition-all ${
                        formData.priority === priority
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileSelect(e, false)}
                    className="hidden"
                    id="ticket-attachment"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <label htmlFor="ticket-attachment" className="cursor-pointer">
                    <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop files
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF, DOC up to 10MB each (max 5 files)
                    </p>
                  </label>
                </div>

                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAttachment(index, false)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setShowSystemInfo(!showSystemInfo)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Auto-collected System Information
                  </span>
                  {showSystemInfo ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {showSystemInfo && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Browser:</span>
                      <span className="ml-2 text-gray-900">{getSystemInfo().browser}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Device:</span>
                      <span className="ml-2 text-gray-900">{getSystemInfo().device}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">OS:</span>
                      <span className="ml-2 text-gray-900">{getSystemInfo().os}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ERP Version:</span>
                      <span className="ml-2 text-gray-900">{getSystemInfo().erp_version}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('list');
                    setFormData({
                      category: '',
                      module: '',
                      title: '',
                      description: '',
                      priority: 'medium',
                    });
                    setAttachments([]);
                    setFormErrors({});
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTicket}
                  disabled={submitting || uploading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting || uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{uploading ? 'Uploading...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TICKET DETAIL VIEW */}
        {activeView === 'detail' && selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Metadata Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Ticket #{selectedTicket.ticket_number}
                    </h2>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadge(
                        selectedTicket.status
                      )}`}
                    >
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getPriorityBadge(
                        selectedTicket.priority
                      )}`}
                    >
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h3 className="text-lg text-gray-700 mb-4">{selectedTicket.title}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {selectedTicket.category.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Module</p>
                  <p className="text-sm font-medium text-gray-900">
                    {modules.find((m) => m.value === selectedTicket.module)?.label ||
                      selectedTicket.module}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(selectedTicket.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(selectedTicket.updated_at)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* Initial Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Attachments</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedTicket.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                        </div>
                        <a
                          href={file.file_url}
                          download
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Info */}
              {selectedTicket.system_info && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">System Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Browser:</span>
                      <span className="ml-2 text-gray-900">{selectedTicket.system_info.browser}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Device:</span>
                      <span className="ml-2 text-gray-900">{selectedTicket.system_info.device}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">OS:</span>
                      <span className="ml-2 text-gray-900">{selectedTicket.system_info.os}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ERP Version:</span>
                      <span className="ml-2 text-gray-900">
                        {selectedTicket.system_info.erp_version}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Comments Thread */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversation</h3>

              {/* Comments List */}
              <div className="space-y-4 mb-6">
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {comment.user_name}
                              </span>
                              <span className="text-xs text-gray-500">{comment.user_role}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>

                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {comment.attachments.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200"
                                >
                                  <Paperclip className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-900 flex-1">{file.file_name}</span>
                                  <a
                                    href={file.file_url}
                                    download
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No comments yet. Be the first to add a comment!</p>
                  </div>
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Comment</label>
                <textarea
                  placeholder="Type your message here..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                />

                {/* Comment Attachments */}
                <div className="mb-4">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileSelect(e, true)}
                    className="hidden"
                    id="comment-attachment"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <label
                    htmlFor="comment-attachment"
                    className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Attach Files</span>
                  </label>

                  {commentAttachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {commentAttachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <Paperclip className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <button
                            onClick={() => removeAttachment(index, true)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handlePostComment}
                    disabled={postingComment || (!newComment.trim() && commentAttachments.length === 0)}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {postingComment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Post Comment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            {selectedTicket.activity_log && selectedTicket.activity_log.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Activity Timeline</span>
                </h3>

                <div className="space-y-4">
                  {selectedTicket.activity_log.map((activity) => (
                    <div key={activity.id} className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Activity className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{activity.user_name}</span>{' '}
                            {activity.action}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>
                        {activity.details && (
                          <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
