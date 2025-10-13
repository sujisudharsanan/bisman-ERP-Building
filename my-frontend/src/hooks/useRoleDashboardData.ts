/**
 * Role Dashboard Data Hook
 * Fetches and provides role-specific dashboard data
 */

'use client';

import { useState, useEffect } from 'react';
import type { DashboardData, DashboardRole } from '@/types/dashboard';

/**
 * Mock data generator for role-specific dashboards
 * TODO: Replace with actual API calls
 */
const getMockDashboardData = (role: DashboardRole): DashboardData => {
  const dashboardConfigs: Record<DashboardRole, DashboardData> = {
    ADMIN: {
      role: 'ADMIN',
      summary: {
        totalTasks: 120,
        completed: 95,
        pending: 25,
        overdue: 5,
      },
      modules: [
        {
          id: 'shipments',
          name: 'Shipments',
          description: 'View and manage all shipments across hubs',
          value: 42,
          icon: 'FaTruck',
          link: '/shipments',
          color: 'blue',
        },
        {
          id: 'staff',
          name: 'Staff Management',
          description: 'Monitor team performance and assignments',
          value: 28,
          icon: 'FaUsers',
          link: '/staff',
          color: 'green',
        },
        {
          id: 'routes',
          name: 'Route Planning',
          description: 'Plan and optimize delivery routes',
          value: 15,
          icon: 'FaRoute',
          link: '/routes',
          color: 'purple',
        },
        {
          id: 'reports',
          name: 'Reports & Analytics',
          description: 'View operational reports and insights',
          value: 8,
          icon: 'FaChartLine',
          link: '/reports',
          color: 'orange',
        },
        {
          id: 'hubs',
          name: 'Hub Management',
          description: 'Manage hub operations and inventory',
          value: 12,
          icon: 'FaWarehouse',
          link: '/hubs',
          color: 'indigo',
        },
        {
          id: 'customers',
          name: 'Customer Management',
          description: 'Manage customer accounts and orders',
          value: 234,
          icon: 'FaUserFriends',
          link: '/customers',
          color: 'pink',
        },
      ],
      recentActivities: [
        {
          id: '1',
          title: 'Route #234 Completed',
          description: 'Completed by Driver Rahul Singh',
          timestamp: new Date().toISOString(),
          type: 'success',
        },
        {
          id: '2',
          title: 'New Staff Member Added',
          description: 'John Doe joined as Hub Incharge',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: 'info',
        },
        {
          id: '3',
          title: 'Shipment Delayed',
          description: 'Shipment #567 delayed due to weather',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          type: 'warning',
        },
      ],
      alerts: [
        {
          id: '1',
          type: 'warning',
          title: '5 Shipments Delayed',
          message: 'Action required on delayed shipments',
          actionLabel: 'View Details',
          actionLink: '/shipments?status=delayed',
        },
      ],
      quickActions: [
        { id: '1', label: 'Add Route', icon: 'FaPlus', action: '/routes/new', color: 'blue' },
        { id: '2', label: 'Assign Driver', icon: 'FaUserPlus', action: '/staff/assign', color: 'green' },
        { id: '3', label: 'Generate Report', icon: 'FaFileAlt', action: '/reports/generate', color: 'purple' },
      ],
    },
    MANAGER: {
      role: 'MANAGER',
      summary: {
        totalTasks: 85,
        completed: 70,
        pending: 15,
        overdue: 2,
      },
      modules: [
        {
          id: 'performance',
          name: 'Team Performance',
          description: 'Monitor team metrics and KPIs',
          value: '92%',
          icon: 'FaChartBar',
          link: '/performance',
          color: 'green',
        },
        {
          id: 'daily-ops',
          name: 'Daily Operations',
          description: 'Oversee daily operational activities',
          value: 18,
          icon: 'FaClipboardList',
          link: '/operations',
          color: 'blue',
        },
        {
          id: 'staff',
          name: 'Staff Overview',
          description: 'View staff schedules and assignments',
          value: 12,
          icon: 'FaUsers',
          link: '/staff',
          color: 'purple',
        },
        {
          id: 'hub-stats',
          name: 'Hub Statistics',
          description: 'View performance across all hubs',
          value: 8,
          icon: 'FaWarehouse',
          link: '/hubs/statistics',
          color: 'orange',
        },
        {
          id: 'approvals',
          name: 'Pending Approvals',
          description: 'Review and approve pending requests',
          value: 5,
          icon: 'FaCheckCircle',
          link: '/approvals',
          badge: 'New',
          color: 'red',
        },
      ],
      recentActivities: [
        {
          id: '1',
          title: 'Team Performance Review',
          description: 'Monthly review completed',
          timestamp: new Date().toISOString(),
          type: 'success',
        },
        {
          id: '2',
          title: 'Approval Pending',
          description: '3 leave requests awaiting approval',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          type: 'warning',
        },
      ],
      alerts: [
        {
          id: '1',
          type: 'info',
          title: '2 Tasks Overdue',
          message: 'Please review overdue tasks',
          actionLabel: 'View Tasks',
          actionLink: '/tasks?status=overdue',
        },
      ],
      quickActions: [
        { id: '1', label: 'Approve Requests', icon: 'FaCheck', action: '/approvals', color: 'green' },
        { id: '2', label: 'View Reports', icon: 'FaFileAlt', action: '/reports', color: 'blue' },
      ],
    },
    HUB_INCHARGE: {
      role: 'HUB_INCHARGE',
      summary: {
        totalTasks: 45,
        completed: 38,
        pending: 7,
        overdue: 1,
      },
      modules: [
        {
          id: 'packages',
          name: 'Package Status',
          description: 'Track incoming and outgoing packages',
          value: 67,
          icon: 'FaBox',
          link: '/packages',
          color: 'blue',
        },
        {
          id: 'inventory',
          name: 'Inventory',
          description: 'Manage hub inventory and stock',
          value: 234,
          icon: 'FaBoxes',
          link: '/inventory',
          color: 'green',
        },
        {
          id: 'deliveries',
          name: 'Today\'s Deliveries',
          description: 'View scheduled deliveries for today',
          value: 28,
          icon: 'FaTruck',
          link: '/deliveries',
          color: 'orange',
        },
        {
          id: 'exceptions',
          name: 'Delivery Exceptions',
          description: 'Handle failed or delayed deliveries',
          value: 4,
          icon: 'FaExclamationTriangle',
          link: '/exceptions',
          badge: 'Urgent',
          color: 'red',
        },
        {
          id: 'drivers',
          name: 'Driver Management',
          description: 'Assign routes and monitor drivers',
          value: 8,
          icon: 'FaUserTie',
          link: '/drivers',
          color: 'purple',
        },
      ],
      recentActivities: [
        {
          id: '1',
          title: 'Package Received',
          description: '45 packages received from central hub',
          timestamp: new Date().toISOString(),
          type: 'success',
        },
        {
          id: '2',
          title: 'Delivery Exception',
          description: 'Customer not available at delivery address',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          type: 'warning',
        },
      ],
      alerts: [
        {
          id: '1',
          type: 'warning',
          title: '4 Delivery Exceptions',
          message: 'Immediate attention required',
          actionLabel: 'Resolve',
          actionLink: '/exceptions',
        },
      ],
      quickActions: [
        { id: '1', label: 'Scan Package', icon: 'FaQrcode', action: '/packages/scan', color: 'blue' },
        { id: '2', label: 'Assign Route', icon: 'FaRoute', action: '/routes/assign', color: 'green' },
      ],
    },
    AUDITOR: {
      role: 'AUDITOR',
      summary: {
        totalTasks: 32,
        completed: 28,
        pending: 4,
        overdue: 0,
      },
      modules: [
        {
          id: 'audit-reports',
          name: 'Audit Reports',
          description: 'View and manage audit reports',
          value: 15,
          icon: 'FaFileContract',
          link: '/audit-reports',
          color: 'blue',
        },
        {
          id: 'document-verification',
          name: 'Document Verification',
          description: 'Verify and validate documents',
          value: 23,
          icon: 'FaFileAlt',
          link: '/verification',
          color: 'green',
        },
        {
          id: 'compliance',
          name: 'Compliance Check',
          description: 'Monitor compliance with regulations',
          value: '98%',
          icon: 'FaShieldAlt',
          link: '/compliance',
          color: 'purple',
        },
        {
          id: 'exception-logs',
          name: 'Exception Logs',
          description: 'Review operational exceptions',
          value: 8,
          icon: 'FaExclamationCircle',
          link: '/exception-logs',
          color: 'orange',
        },
        {
          id: 'financial-audit',
          name: 'Financial Audit',
          description: 'Conduct financial audits and reviews',
          value: 5,
          icon: 'FaDollarSign',
          link: '/financial-audit',
          color: 'indigo',
        },
      ],
      recentActivities: [
        {
          id: '1',
          title: 'Audit Completed',
          description: 'Hub #3 audit successfully completed',
          timestamp: new Date().toISOString(),
          type: 'success',
        },
        {
          id: '2',
          title: 'Compliance Issue',
          description: 'Minor compliance issue found in Hub #5',
          timestamp: new Date(Date.now() - 5400000).toISOString(),
          type: 'warning',
        },
      ],
      alerts: [],
      quickActions: [
        { id: '1', label: 'Start Audit', icon: 'FaClipboardCheck', action: '/audit-reports/new', color: 'blue' },
        { id: '2', label: 'Verify Documents', icon: 'FaCheck', action: '/verification', color: 'green' },
      ],
    },
    STAFF: {
      role: 'STAFF',
      summary: {
        totalTasks: 20,
        completed: 18,
        pending: 2,
      },
      modules: [
        {
          id: 'my-tasks',
          name: 'My Tasks',
          description: 'View and manage assigned tasks',
          value: 12,
          icon: 'FaTasks',
          link: '/tasks',
          color: 'blue',
        },
        {
          id: 'schedule',
          name: 'My Schedule',
          description: 'View work schedule and shifts',
          value: '8h',
          icon: 'FaCalendar',
          link: '/schedule',
          color: 'green',
        },
        {
          id: 'timesheet',
          name: 'Timesheet',
          description: 'Track work hours and attendance',
          value: '40h',
          icon: 'FaClock',
          link: '/timesheet',
          color: 'purple',
        },
        {
          id: 'notifications',
          name: 'Notifications',
          description: 'View system notifications',
          value: 5,
          icon: 'FaBell',
          link: '/notifications',
          badge: 'New',
          color: 'orange',
        },
      ],
      recentActivities: [
        {
          id: '1',
          title: 'Task Completed',
          description: 'Package delivery completed',
          timestamp: new Date().toISOString(),
          type: 'success',
        },
      ],
      alerts: [],
      quickActions: [
        { id: '1', label: 'Clock In', icon: 'FaClock', action: '/timesheet/clock-in', color: 'green' },
        { id: '2', label: 'View Schedule', icon: 'FaCalendar', action: '/schedule', color: 'blue' },
      ],
    },
    USER: {
      role: 'USER',
      summary: {
        totalTasks: 5,
        completed: 4,
        pending: 1,
      },
      modules: [
        {
          id: 'profile',
          name: 'My Profile',
          description: 'View and update profile information',
          value: '100%',
          icon: 'FaUser',
          link: '/profile',
          color: 'blue',
        },
        {
          id: 'orders',
          name: 'My Orders',
          description: 'Track your orders and shipments',
          value: 3,
          icon: 'FaShoppingCart',
          link: '/orders',
          color: 'green',
        },
        {
          id: 'notifications',
          name: 'Notifications',
          description: 'View your notifications',
          value: 2,
          icon: 'FaBell',
          link: '/notifications',
          badge: 'New',
          color: 'orange',
        },
        {
          id: 'support',
          name: 'Support',
          description: 'Get help and support',
          value: 1,
          icon: 'FaQuestionCircle',
          link: '/support',
          color: 'purple',
        },
      ],
      recentActivities: [
        {
          id: '1',
          title: 'Order Placed',
          description: 'Order #12345 has been placed',
          timestamp: new Date().toISOString(),
          type: 'success',
        },
      ],
      alerts: [],
      quickActions: [
        { id: '1', label: 'Track Order', icon: 'FaTruck', action: '/orders/track', color: 'blue' },
        { id: '2', label: 'Contact Support', icon: 'FaEnvelope', action: '/support', color: 'green' },
      ],
    },
  };

  return dashboardConfigs[role];
};

/**
 * Hook to fetch role-specific dashboard data
 */
export function useRoleDashboardData(role: DashboardRole) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/dashboard/${role}`);
        // const data = await response.json();
        
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const mockData = getMockDashboardData(role);
        setData(mockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role]);

  return { data, loading, error };
}
