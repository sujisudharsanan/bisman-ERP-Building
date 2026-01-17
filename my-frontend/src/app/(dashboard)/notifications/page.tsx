'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  Settings,
  Search,
  Filter,
  Check,
  CheckCheck,
  Trash2,
  Archive,
  Eye,
  MoreVertical,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  Truck,
  Calendar,
  Clock,
  Star,
  Volume2,
  VolumeX,
  Mail,
  MessageSquare
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'order' | 'inventory' | 'payment' | 'user' | 'system' | 'shipping';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, string>;
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sound: boolean;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockNotifications: Notification[] = [
  {
    id: 'N001',
    type: 'warning',
    category: 'inventory',
    title: 'Low Stock Alert',
    message: 'Product SKU-12345 (Industrial Motor 5HP) has reached minimum stock level. Current quantity: 5 units.',
    timestamp: '2024-01-16 10:30',
    isRead: false,
    isArchived: false,
    actionUrl: '/inventory/items/SKU-12345',
    actionLabel: 'View Item',
    metadata: { sku: 'SKU-12345', quantity: '5' }
  },
  {
    id: 'N002',
    type: 'success',
    category: 'order',
    title: 'New Order Received',
    message: 'Order #ORD-2024-00156 received from Sharma Electronics worth ₹2,50,000.',
    timestamp: '2024-01-16 09:45',
    isRead: false,
    isArchived: false,
    actionUrl: '/orders/ORD-2024-00156',
    actionLabel: 'View Order',
    metadata: { orderId: 'ORD-2024-00156', amount: '₹2,50,000' }
  },
  {
    id: 'N003',
    type: 'info',
    category: 'shipping',
    title: 'Shipment Delivered',
    message: 'Shipment BSM1234567890 has been delivered to customer successfully.',
    timestamp: '2024-01-16 08:30',
    isRead: true,
    isArchived: false,
    actionUrl: '/shipping/shipment-tracking?id=BSM1234567890',
    actionLabel: 'View Details'
  },
  {
    id: 'N004',
    type: 'error',
    category: 'payment',
    title: 'Payment Failed',
    message: 'Payment for invoice INV-2024-00089 from Patel Traders failed. Retry required.',
    timestamp: '2024-01-16 07:15',
    isRead: false,
    isArchived: false,
    actionUrl: '/finance/invoices/INV-2024-00089',
    actionLabel: 'View Invoice',
    metadata: { invoiceId: 'INV-2024-00089' }
  },
  {
    id: 'N005',
    type: 'info',
    category: 'user',
    title: 'New User Registration',
    message: 'New user Amit Kumar has registered and is pending approval.',
    timestamp: '2024-01-15 16:45',
    isRead: true,
    isArchived: false,
    actionUrl: '/admin/users?status=pending',
    actionLabel: 'Review'
  },
  {
    id: 'N006',
    type: 'warning',
    category: 'system',
    title: 'Scheduled Maintenance',
    message: 'System maintenance scheduled for Jan 20, 2024, 2:00 AM - 4:00 AM IST.',
    timestamp: '2024-01-15 14:00',
    isRead: true,
    isArchived: false
  },
  {
    id: 'N007',
    type: 'success',
    category: 'payment',
    title: 'Payment Received',
    message: 'Payment of ₹1,85,000 received from TechCorp Solutions for invoice INV-2024-00085.',
    timestamp: '2024-01-15 11:30',
    isRead: true,
    isArchived: false,
    metadata: { amount: '₹1,85,000', invoiceId: 'INV-2024-00085' }
  },
  {
    id: 'N008',
    type: 'info',
    category: 'order',
    title: 'Order Shipped',
    message: 'Order #ORD-2024-00150 has been shipped via BlueDart Express.',
    timestamp: '2024-01-15 10:00',
    isRead: true,
    isArchived: true
  }
];

// ============================================================================
// Sub-Components
// ============================================================================

function TypeIcon({ type, category }: { type: Notification['type']; category: Notification['category'] }) {
  const categoryIcons = {
    order: ShoppingCart,
    inventory: Package,
    payment: DollarSign,
    user: Users,
    system: Settings,
    shipping: Truck
  };

  const typeColors = {
    info: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    error: 'bg-red-100 text-red-600'
  };

  const Icon = categoryIcons[category];

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeColors[type]}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
}

function NotificationItem({ 
  notification, 
  onMarkRead, 
  onArchive,
  onDelete 
}: { 
  notification: Notification;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`p-4 border-b hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50/50' : ''}`}>
      <div className="flex gap-4">
        <TypeIcon type={notification.type} category={notification.category} />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h4 className={`text-sm ${notification.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'}`}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{notification.timestamp}</span>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {notification.actionUrl && (
                <a 
                  href={notification.actionUrl}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {notification.actionLabel || 'View Details'}
                </a>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!notification.isRead && (
                <button 
                  onClick={() => onMarkRead(notification.id)}
                  className="p-1 hover:bg-gray-200 rounded" 
                  title="Mark as read"
                >
                  <Check className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <button 
                onClick={() => onArchive(notification.id)}
                className="p-1 hover:bg-gray-200 rounded" 
                title="Archive"
              >
                <Archive className="w-4 h-4 text-gray-500" />
              </button>
              <button 
                onClick={() => onDelete(notification.id)}
                className="p-1 hover:bg-red-100 rounded" 
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings({ onClose }: { onClose: () => void }) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    inApp: true,
    sound: false
  });

  const categories = [
    { id: 'order', label: 'Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'payment', label: 'Payments', icon: DollarSign },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'user', label: 'Users', icon: Users },
    { id: 'system', label: 'System', icon: Settings }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Notification Settings</h2>
          <p className="text-sm text-gray-500">Configure how you receive notifications</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Delivery Methods */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Delivery Methods</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span>Email Notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email}
                  onChange={(e) => setPreferences(p => ({ ...p, email: e.target.checked }))}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <span>Push Notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.push}
                  onChange={(e) => setPreferences(p => ({ ...p, push: e.target.checked }))}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                  <span>In-App Notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.inApp}
                  onChange={(e) => setPreferences(p => ({ ...p, inApp: e.target.checked }))}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {preferences.sound ? 
                    <Volume2 className="w-5 h-5 text-gray-500" /> : 
                    <VolumeX className="w-5 h-5 text-gray-500" />
                  }
                  <span>Notification Sounds</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sound}
                  onChange={(e) => setPreferences(p => ({ ...p, sound: e.target.checked }))}
                  className="rounded"
                />
              </label>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Notification Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <label key={cat.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesFilter = 
        filter === 'all' ? !n.isArchived :
        filter === 'unread' ? !n.isRead && !n.isArchived :
        n.isArchived;
      const matchesCategory = categoryFilter === 'all' || n.category === categoryFilter;
      const matchesSearch = 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesCategory && matchesSearch;
    });
  }, [notifications, filter, categoryFilter, searchQuery]);

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;

  const handleMarkRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleArchive = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isArchived: true } : n
    ));
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-full">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-gray-500 dark:text-gray-400">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'unread', 'archived'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                {f}
                {f === 'unread' && unreadCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-slate-800 dark:text-gray-200"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-slate-800 dark:text-gray-200"
          >
            <option value="all">All Categories</option>
            <option value="order">Orders</option>
            <option value="inventory">Inventory</option>
            <option value="payment">Payments</option>
            <option value="shipping">Shipping</option>
            <option value="user">Users</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-gray-700 overflow-hidden">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'unread' ? 'No unread notifications' :
                 filter === 'archived' ? 'No archived notifications' :
                 'No notifications found'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <NotificationSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
