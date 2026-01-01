'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ConnectedCard from './ConnectedCard';
import { dashboardConnections } from '@/config/dashboardConnections';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useAuth } from '@/hooks/useAuth';
import { getRoleDisplayName } from '@/utils/roleDisplay';
import { 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

type TaskDeadline = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority?: string;
};

type RightPanelProps = {
  mode?: 'sidebar' | 'inline' | 'dock';
  hideProfile?: boolean;
  viewMode?: 'my-work' | 'my-requests' | 'all';
  taskCounts?: {
    ASSIGNED: number;
    IN_PROGRESS: number;
    NEED_ATTENTION: number;
    DONE: number;
  };
  performanceMetrics?: {
    onTimeRate: number;
    responseTime: number;
    completionRate: number;
    qualityScore: number;
  };
  onMetricClick?: (column: string) => void;
  upcomingDeadlines?: TaskDeadline[];
};

const RightPanel: React.FC<RightPanelProps> = ({ 
  mode = 'sidebar', 
  hideProfile = false,
  viewMode = 'my-work',
  taskCounts,
  performanceMetrics,
  onMetricClick,
  upcomingDeadlines = []
}) => {
  const { user } = useAuth();
  const router = useRouter();
  
  // Convert profile_pic_url to secure endpoint if needed
  const getProfilePicUrl = (url: string | undefined) => {
    if (!url) return null;
    // If it's already an /api path, return as-is
    if (url.startsWith('/api/')) return url;
    // Convert /uploads/ to /api/secure-files/
    if (url.startsWith('/uploads/')) {
      return url.replace('/uploads/', '/api/secure-files/');
    }
    return url;
  };
  
  const profilePicUrl = getProfilePicUrl(user?.profile_pic_url);
  
  // Performance metrics chart colors
  const performanceColors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b']; // Green, Blue, Purple, Orange
  
  // Debug: Log performance metrics when they change
  React.useEffect(() => {
    console.log('[RightPanel] performanceMetrics prop:', performanceMetrics);
  }, [performanceMetrics]);
  
  // Check if we have any performance data
  const hasPerformanceData = useMemo(() => {
    const metrics = performanceMetrics;
    if (!metrics) return false;
    return metrics.onTimeRate > 0 || metrics.responseTime > 0 || 
           metrics.completionRate > 0 || metrics.qualityScore > 0;
  }, [performanceMetrics]);
  
  // Build performance chart data from props or use defaults
  const performanceChartData = useMemo(() => {
    // Use passed metrics, but ensure we have visible data if all zeros
    const metrics = performanceMetrics || {
      onTimeRate: 0,
      responseTime: 0,
      completionRate: 0,
      qualityScore: 0
    };
    
    console.log('[RightPanel] Chart metrics:', metrics, 'hasData:', hasPerformanceData);
    
    return {
      labels: ['On Time', 'Response', 'Complete', 'Quality'],
      datasets: [
        {
          label: 'Performance %',
          data: [
            metrics.onTimeRate,
            metrics.responseTime,
            metrics.completionRate,
            metrics.qualityScore
          ],
          backgroundColor: performanceColors,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
        },
      ],
    };
  }, [performanceMetrics, hasPerformanceData]);

  // Helper function to safely get CSS variables (client-side only)
  const getCSSVar = (varName: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(varName) || fallback;
  };

  const barOptions = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bars for better label visibility
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `${context.parsed.x}%`
        }
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: string | number) {
            return `${value}%`;
          }
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10
          }
        },
      },
    },
  }), []);

  const createDoughnutData = (value: number, color: string) => ({
    datasets: [
      {
        data: [value, 100 - value],
        backgroundColor: [color, 'rgba(156, 163, 175, 0.2)'], // Use transparent gray for empty portion - works in both modes
        borderWidth: 0,
      },
    ],
  });

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '75%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  // Column-based efficiency metrics with matching Kanban colors
  const columnColors = {
    ASSIGNED: '#3b82f6',      // Blue
    IN_PROGRESS: '#eab308',   // Yellow
    NEED_ATTENTION: '#f59e0b', // Orange/Amber
    DONE: '#22c55e',          // Green
  };

  // Calculate efficiency percentages based on task counts
  const totalTasks = taskCounts 
    ? taskCounts.ASSIGNED + taskCounts.IN_PROGRESS + taskCounts.NEED_ATTENTION + taskCounts.DONE
    : 0;
  
  const efficiencyData = [
    { 
      column: 'ASSIGNED', 
      label: 'Assigned', 
      value: taskCounts?.ASSIGNED || 0, 
      percentage: totalTasks > 0 ? Math.round((taskCounts?.ASSIGNED || 0) / totalTasks * 100) : 0,
      color: columnColors.ASSIGNED,
      icon: <ClipboardList className="w-3 h-3" />
    },
    { 
      column: 'IN_PROGRESS', 
      label: 'In Progress', 
      value: taskCounts?.IN_PROGRESS || 0, 
      percentage: totalTasks > 0 ? Math.round((taskCounts?.IN_PROGRESS || 0) / totalTasks * 100) : 0,
      color: columnColors.IN_PROGRESS,
      icon: <Clock className="w-3 h-3" />
    },
    { 
      column: 'NEED_ATTENTION', 
      label: 'Attention', 
      value: taskCounts?.NEED_ATTENTION || 0, 
      percentage: totalTasks > 0 ? Math.round((taskCounts?.NEED_ATTENTION || 0) / totalTasks * 100) : 0,
      color: columnColors.NEED_ATTENTION,
      icon: <AlertTriangle className="w-3 h-3" />
    },
    { 
      column: 'DONE', 
      label: 'Done', 
      value: taskCounts?.DONE || 0, 
      percentage: totalTasks > 0 ? Math.round((taskCounts?.DONE || 0) / totalTasks * 100) : 0,
      color: columnColors.DONE,
      icon: <CheckCircle2 className="w-3 h-3" />
    },
  ];

  // Get efficiency title based on view mode
  const efficiencyTitle = viewMode === 'my-work' ? 'Efficiency' : 'Respond Efficiency';

  // Priority colors for schedule items
  const priorityColors: Record<string, string> = {
    HIGH: 'border-red-500',
    MEDIUM: 'border-yellow-500',
    LOW: 'border-green-500',
    URGENT: 'border-purple-500',
  };

  // Format deadline items from upcomingDeadlines prop
  const scheduleItems = useMemo(() => {
    if (!upcomingDeadlines || upcomingDeadlines.length === 0) {
      return [];
    }
    
    return upcomingDeadlines.map((task) => {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const isToday = dueDate.toDateString() === today.toDateString();
      const isTomorrow = dueDate.toDateString() === new Date(today.getTime() + 86400000).toDateString();
      
      let timeLabel: string;
      if (isToday) {
        timeLabel = `Today ${dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (isTomorrow) {
        timeLabel = `Tomorrow ${dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timeLabel = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      
      const color = priorityColors[task.priority?.toUpperCase() || ''] || 'border-blue-500';
      
      return {
        id: task.id,
        time: timeLabel,
        task: task.title,
        color,
        dueDate: task.dueDate,
      };
    });
  }, [upcomingDeadlines]);

  const isInline = mode === 'inline';
  const isDock = mode === 'dock';
  const containerClass = isInline
    ? 'w-full bg-transparent border-0 backdrop-blur-0 overflow-visible h-auto min-h-0'
    : isDock
  ? 'w-44 sm:w-48 md:w-52 lg:w-52 xl:w-52 bg-transparent border-0 backdrop-blur-0 h-full overflow-y-auto -ml-2 min-h-0'
  : 'w-full lg:w-52 xl:w-56 2xl:w-64 bg-panel/60 backdrop-blur-sm border-l border-theme overflow-y-auto flex flex-col h-full min-h-0 px-0.5';
  const wrapperClass = isInline
    ? 'grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 max-w-[960px] xl:max-w-[1000px]'
    : isDock
      ? 'flex flex-col gap-2 px-0.5 py-1'
      : 'flex flex-col';
  const cardGap = isInline || isDock ? '' : 'mb-5';

  return (
    <aside className={containerClass}>
  <div className={isInline ? 'w-full flex justify-end' : ''}>
       <div className={wrapperClass}>
    {/* User Profile Section - hidden when displayed in top bar */}
  {!hideProfile && (
  <ConnectedCard type="profile" className={`p-1 sm:p-1 ${cardGap} order-1 xl:col-span-1 xl:col-start-1`}>
  <div 
    className="flex items-center justify-between pr-0 flex-shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/30 rounded-lg transition-colors -m-1 p-1"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[RightPanel] Navigating to /common/about-me');
      router.push('/common/about-me');
    }}
    title="View profile"
  >
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-theme truncate">
            {user?.username 
              ? user.username.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
              : user?.email?.split('@')[0] || 'User'}
          </h3>
          <p className="text-xs text-muted truncate">
            {getRoleDisplayName(user?.roleName || user?.role)}
          </p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 ml-2 overflow-hidden relative">
          {profilePicUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profilePicUrl} 
                alt="Profile" 
                className="w-full h-full object-cover absolute inset-0 z-10"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  console.error('Failed to load profile picture:', profilePicUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Fallback initial shown behind image */}
              <span className="text-white font-bold text-sm sm:text-base">
                {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
              </span>
            </>
          ) : (
            <span className="text-white font-bold text-sm sm:text-base">
              {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </ConnectedCard>
  )}

      {/* Performance Overview Chart */}
  <ConnectedCard type="completedTasks" className={`p-1 sm:p-1 ${cardGap} order-3 xl:col-span-1 xl:col-start-2`}>
    <h2 className="font-semibold text-theme mb-1.5 sm:mb-2 uppercase text-[10px] sm:text-xs tracking-wide">Performance Overview</h2>
  <div className="w-full h-24 sm:h-28 md:h-32 lg:h-36 bg-panel/40 rounded-xl p-2 sm:p-2 border border-theme relative">
          {hasPerformanceData ? (
            <Bar data={performanceChartData} options={barOptions} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted text-xs">
              <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>No completed tasks yet</span>
              <span className="text-[10px] opacity-70">Complete tasks to see metrics</span>
            </div>
          )}
        </div>
      </ConnectedCard>

      {/* Efficiency Section */}
  <ConnectedCard type="efficiency" className={`p-1 sm:p-1 ${cardGap} order-2 xl:col-span-1 xl:col-start-3`}>
  <h2 className="font-semibold text-theme mb-1.5 sm:mb-2 uppercase text-[10px] sm:text-xs tracking-wide">{efficiencyTitle}</h2>
        <div className="grid grid-cols-4 gap-0.5 sm:gap-1">
          {efficiencyData.map((item, index) => (
            <div 
              key={index} 
              className="text-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onMetricClick?.(item.column)}
              title={`Click to view ${item.label} tasks (${item.value} of ${totalTasks})`}
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-0.5">
                <Doughnut 
                  data={createDoughnutData(item.percentage, item.color)} 
                  options={doughnutOptions} 
                />
                {/* Center content: percentage only */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] sm:text-[10px] font-bold leading-tight" style={{ color: item.color }}>
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <p className="text-[8px] sm:text-[9px] text-muted truncate">{item.label}</p>
            </div>
          ))}
        </div>
      </ConnectedCard>

      {/* Plan/Schedule Section (Daily Plan and Schedule) - Add padding for FAB */}
  <ConnectedCard type="plan" className={`w-full p-1 sm:p-1 order-4 min-h-[120px] pb-20 ${isInline ? 'lg:col-span-2 xl:col-span-2 xl:col-start-2' : ''}` }>
    <h2 
      className="font-semibold text-theme mb-1.5 sm:mb-2 uppercase text-[10px] sm:text-xs tracking-wide cursor-pointer hover:text-blue-500 transition-colors"
      onClick={() => router.push('/common/calendar')}
      title="View Calendar"
    >
      {dashboardConnections.plan.description}
    </h2>
  <div className="space-y-2.5 max-h-40 md:max-h-44 overflow-y-auto pb-16">
          {scheduleItems.length > 0 ? (
            scheduleItems.map((item, index) => (
              <div 
                key={item.id || index} 
                className={`w-full p-1 sm:p-1 bg-panel/60 rounded-lg border-l-2 sm:border-l-3 ${item.color} hover:bg-panel/80 transition-colors cursor-pointer`}
                onClick={() => router.push('/common/calendar')}
                title="View in Calendar"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-theme font-medium text-[10px] sm:text-xs truncate">{item.time}</p>
                    <p className="text-muted text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 line-clamp-2">{item.task}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-muted text-[10px] sm:text-xs">No upcoming deadlines</p>
              <button 
                onClick={() => router.push('/common/calendar')}
                className="text-blue-500 hover:text-blue-600 text-[10px] sm:text-xs mt-1 underline"
              >
                View Calendar
              </button>
            </div>
          )}
        </div>
  </ConnectedCard>
  </div>
  </div>
  </aside>
  );
};

export default RightPanel;
