'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Search, 
  Filter,
  User,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  Plus,
  Eye
} from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function ActivityLogViewer() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [limit, setLimit] = useState(50);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/super-admin/activity?limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setActivities(result.data);
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [limit]);

  const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    
    if (lowerAction.includes('create') || lowerAction.includes('register')) {
      return <Plus className="w-4 h-4 text-green-500" />;
    }
    if (lowerAction.includes('update') || lowerAction.includes('edit') || lowerAction.includes('change')) {
      return <Edit3 className="w-4 h-4 text-blue-500" />;
    }
    if (lowerAction.includes('delete') || lowerAction.includes('remove')) {
      return <Trash2 className="w-4 h-4 text-red-500" />;
    }
    if (lowerAction.includes('login') || lowerAction.includes('signin')) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (lowerAction.includes('logout') || lowerAction.includes('signout')) {
      return <XCircle className="w-4 h-4 text-gray-500" />;
    }
    if (lowerAction.includes('view') || lowerAction.includes('read')) {
      return <Eye className="w-4 h-4 text-blue-400" />;
    }
    if (lowerAction.includes('error') || lowerAction.includes('fail')) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    
    if (lowerAction.includes('create') || lowerAction.includes('register')) {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (lowerAction.includes('update') || lowerAction.includes('edit')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (lowerAction.includes('delete') || lowerAction.includes('remove')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (lowerAction.includes('login')) {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (lowerAction.includes('logout')) {
      return 'bg-gray-50 text-gray-700 border-gray-200';
    }
    if (lowerAction.includes('error') || lowerAction.includes('fail')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAction === 'all' || 
      activity.action.toLowerCase().includes(filterAction.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
          </div>
          <button
            onClick={loadActivities}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="20">Last 20</option>
            <option value="50">Last 50</option>
            <option value="100">Last 100</option>
            <option value="500">Last 500</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-600">Loading activity logs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-red-600 font-medium mb-2">Error Loading Activities</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={loadActivities}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Activity className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No activities found</p>
            <p className="text-gray-400 text-sm">
              {searchTerm || filterAction !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Activity logs will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity, index) => (
              <div
                key={activity.id || index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(activity.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(activity.action)}`}>
                            {activity.action}
                          </span>
                          {activity.entity_type && (
                            <span className="text-xs text-gray-500">
                              {activity.entity_type}
                              {activity.entity_id && ` #${activity.entity_id}`}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {activity.username || 'System'}
                          </span>
                          {activity.user_id && (
                            <span className="text-xs text-gray-400">
                              (ID: {activity.user_id})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimestamp(activity.created_at)}</span>
                      </div>
                    </div>

                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                        <pre className="whitespace-pre-wrap font-mono">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {activity.ip_address && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>IP: {activity.ip_address}</span>
                        {activity.user_agent && (
                          <span className="truncate max-w-md">
                            Agent: {activity.user_agent}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && filteredActivities.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filteredActivities.length} of {activities.length} activities
          </p>
        </div>
      )}
    </div>
  );
}
