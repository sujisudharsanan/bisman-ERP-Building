/**
 * Service Table Usage - Admin Dashboard Component
 * 
 * Displays aggregated service → table usage from audit logs
 * with search, filtering, and suspicious service marking.
 * 
 * @module pages/admin/ServiceTableUsage
 * 
 * API Endpoints:
 *   GET  /api/audit/services         - List services with table usage
 *   GET  /api/audit/services/:name   - Service details
 *   POST /api/audit/mark-suspicious  - Mark service as suspicious
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// API HELPER
// ============================================================================

/**
 * Fetch wrapper with auth and error handling
 * TODO: Attach CSRF token from cookie or meta tag
 * TODO: Attach auth token from context/localStorage
 * 
 * @example
 * // Add CSRF token:
 * const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
 * headers['X-CSRF-Token'] = csrfToken;
 * 
 * // Add auth token:
 * const authToken = localStorage.getItem('token') || sessionStorage.getItem('token');
 * headers['Authorization'] = `Bearer ${authToken}`;
 */
async function fetchApi(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    // TODO: Add CSRF token
    // 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content,
    // TODO: Add auth token
    // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// LOADING SKELETON COMPONENT
// ============================================================================

function LoadingSkeleton({ rows = 5 }) {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/6"></div>
          <div className="h-4 bg-gray-300 rounded w-1/6"></div>
          <div className="h-4 bg-gray-300 rounded w-1/6"></div>
        </div>
      ))}
      <span className="sr-only">Loading services...</span>
    </div>
  );
}

// ============================================================================
// ERROR ALERT COMPONENT
// ============================================================================

function ErrorAlert({ message, onRetry }) {
  return (
    <div 
      className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center space-x-3">
        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="text-red-700 text-sm">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-red-600 hover:text-red-800 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SEARCH INPUT COMPONENT
// ============================================================================

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <label htmlFor="service-search" className="sr-only">
        Search services
      </label>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        id="service-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        autoComplete="off"
      />
    </div>
  );
}

// ============================================================================
// SERVICE LIST ITEM COMPONENT
// ============================================================================

function ServiceListItem({ service, onClick, isSelected }) {
  const tableCount = service.tables?.length || service.table_count || 1;
  const lastSeen = service.last_event || service.lastSeen;
  
  return (
    <button
      onClick={() => onClick(service)}
      className={`w-full text-left p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        isSelected 
          ? 'bg-blue-50 border-blue-300 shadow-sm' 
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}
      aria-pressed={isSelected}
      aria-label={`View details for ${service.service_name}`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {service.service_name || 'Unknown Service'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Owner: <span className="font-medium">{service.owner || 'Unassigned'}</span>
          </p>
        </div>
        <div className="flex items-center space-x-4 ml-4">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{tableCount}</p>
            <p className="text-xs text-gray-500">Tables</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Last seen</p>
            <p className="text-xs font-medium text-gray-700">
              {lastSeen ? formatRelativeTime(lastSeen) : 'Never'}
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// SIDE PANEL COMPONENT
// ============================================================================

function ServiceDetailPanel({ service, onClose, onMarkSuspicious, isMarking }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!service) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchApi(`/api/audit/services/${encodeURIComponent(service.service_name)}`)
      .then((data) => {
        if (!cancelled) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [service]);

  if (!service) return null;

  return (
    <div 
      className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[480px] bg-white shadow-xl z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="min-w-0 flex-1">
          <h2 id="panel-title" className="text-lg font-semibold text-gray-900 truncate">
            {service.service_name}
          </h2>
          <p className="text-sm text-gray-500">Service Details</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <div className="space-y-4">
            <LoadingSkeleton rows={3} />
          </div>
        )}

        {error && (
          <ErrorAlert 
            message={error} 
            onRetry={() => setError(null)} 
          />
        )}

        {!loading && !error && details && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {details.summary?.length || 0}
                </p>
                <p className="text-xs text-blue-700">Table Actions</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {details.events?.length || 0}
                </p>
                <p className="text-xs text-green-700">Recent Events</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {details.meta?.total || 0}
                </p>
                <p className="text-xs text-purple-700">Total Events</p>
              </div>
            </div>

            {/* Tables Accessed */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tables Accessed</h3>
              <div className="space-y-2">
                {details.summary && details.summary.length > 0 ? (
                  details.summary.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-2 h-2 rounded-full ${
                          item.operation === 'INSERT' ? 'bg-green-500' :
                          item.operation === 'UPDATE' ? 'bg-yellow-500' :
                          item.operation === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
                        }`} aria-hidden="true" />
                        <span className="text-sm font-medium text-gray-900">
                          {item.table_name}
                        </span>
                        <span className="text-xs text-gray-500 uppercase">
                          {item.operation}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No table access recorded</p>
                )}
              </div>
            </div>

            {/* Recent Queries/Events */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Events</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {details.events && details.events.length > 0 ? (
                  details.events.slice(0, 20).map((event, idx) => (
                    <div 
                      key={event.id || idx}
                      className="p-3 bg-gray-50 rounded-lg text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 rounded text-white text-xs font-medium ${
                          event.operation === 'INSERT' ? 'bg-green-600' :
                          event.operation === 'UPDATE' ? 'bg-yellow-600' :
                          event.operation === 'DELETE' ? 'bg-red-600' : 'bg-gray-600'
                        }`}>
                          {event.operation}
                        </span>
                        <span className="text-gray-500">
                          {event.created_at ? formatRelativeTime(event.created_at) : ''}
                        </span>
                      </div>
                      <p className="font-medium text-gray-700">
                        {event.table_name}
                        {event.row_id && <span className="text-gray-500"> #{event.row_id}</span>}
                      </p>
                      {event.user_id && (
                        <p className="text-gray-500 mt-1">
                          User: {event.user_id}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No recent events</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => onMarkSuspicious(service.service_name)}
          disabled={isMarking}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-busy={isMarking}
        >
          {isMarking ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Marking...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Mark as Suspicious</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a date string to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Group services by name and aggregate tables
 */
function aggregateServices(services) {
  const grouped = {};
  
  for (const svc of services) {
    const name = svc.service_name || 'unknown';
    if (!grouped[name]) {
      grouped[name] = {
        service_name: name,
        owner: svc.owner || null,
        tables: [],
        table_count: 0,
        total_events: 0,
        last_event: null
      };
    }
    
    grouped[name].tables.push({
      name: svc.table_name,
      operation: svc.operation,
      count: svc.event_count
    });
    grouped[name].table_count++;
    grouped[name].total_events += svc.event_count || 0;
    
    // Track latest event
    if (svc.last_event) {
      const eventDate = new Date(svc.last_event);
      if (!grouped[name].last_event || eventDate > new Date(grouped[name].last_event)) {
        grouped[name].last_event = svc.last_event;
      }
    }
  }
  
  return Object.values(grouped);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ServiceTableUsage() {
  // State
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [isMarking, setIsMarking] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch services
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi('/api/audit/services?pageSize=100');
      const aggregated = aggregateServices(data.services || []);
      setServices(aggregated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filter services by search query
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    
    const query = searchQuery.toLowerCase();
    return services.filter(svc => {
      // Search by service name
      if (svc.service_name?.toLowerCase().includes(query)) return true;
      // Search by table name
      if (svc.tables?.some(t => t.name?.toLowerCase().includes(query))) return true;
      // Search by owner
      if (svc.owner?.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [services, searchQuery]);

  // Mark service as suspicious
  const handleMarkSuspicious = async (serviceName) => {
    setIsMarking(true);
    setNotification(null);

    try {
      /**
       * TODO: Attach CSRF token for POST request
       * const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
       */
      await fetchApi('/api/audit/mark-suspicious', {
        method: 'POST',
        body: JSON.stringify({ service: serviceName }),
        // headers: { 'X-CSRF-Token': csrfToken }
      });

      setNotification({
        type: 'success',
        message: `Service "${serviceName}" marked as suspicious`
      });
      
      // Refresh list
      fetchServices();
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to mark suspicious: ${err.message}`
      });
    } finally {
      setIsMarking(false);
    }
  };

  // Close notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Service Table Usage
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Monitor which services access database tables
              </p>
            </div>
            <div className="w-full sm:w-80">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by service, table, or owner..."
              />
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div 
            className={`p-4 rounded-lg flex items-center justify-between ${
              notification.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}
            role="alert"
            aria-live="polite"
          >
            <span className={notification.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-gray-900">{services.length}</p>
            <p className="text-sm text-gray-500">Total Services</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-blue-600">
              {services.reduce((sum, s) => sum + (s.table_count || 0), 0)}
            </p>
            <p className="text-sm text-gray-500">Table Accesses</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-green-600">
              {services.reduce((sum, s) => sum + (s.total_events || 0), 0)}
            </p>
            <p className="text-sm text-gray-500">Total Events</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-purple-600">{filteredServices.length}</p>
            <p className="text-sm text-gray-500">Filtered Results</p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <ErrorAlert message={error} onRetry={fetchServices} />
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <LoadingSkeleton rows={8} />
          </div>
        )}

        {/* Services List */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-sm">
            {filteredServices.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No services found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchQuery 
                    ? `No services match "${searchQuery}"` 
                    : 'No service activity recorded yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 p-4 space-y-2">
                {filteredServices.map((service, idx) => (
                  <ServiceListItem
                    key={service.service_name || idx}
                    service={service}
                    onClick={setSelectedService}
                    isSelected={selectedService?.service_name === service.service_name}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Side Panel */}
      {selectedService && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setSelectedService(null)}
            aria-hidden="true"
          />
          <ServiceDetailPanel
            service={selectedService}
            onClose={() => setSelectedService(null)}
            onMarkSuspicious={handleMarkSuspicious}
            isMarking={isMarking}
          />
        </>
      )}
    </div>
  );
}

/* ============================================================================
 * USAGE
 * ============================================================================
 * 
 * // In your router (e.g., App.jsx or routes config):
 * import ServiceTableUsage from './pages/admin/ServiceTableUsage';
 * 
 * <Route path="/admin/service-usage" element={<ServiceTableUsage />} />
 * 
 * // Or in Next.js (pages/admin/service-usage.js):
 * export default ServiceTableUsage;
 * 
 * ============================================================================ */
