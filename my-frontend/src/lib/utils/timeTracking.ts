/**
 * Time Tracking Utilities
 * Handles SLA compliance calculations, time remaining/overdue display
 */

export interface TimeStatus {
  isOverdue: boolean;
  isCompletedOnTime: boolean;
  isCompletedEarly: boolean;
  timeDiff: number; // milliseconds - negative if overdue, positive if time remaining/saved
  displayText: string;
  urgencyLevel: 'normal' | 'warning' | 'critical' | 'success' | 'excellent';
}

/**
 * Format duration in human-readable format
 * @param ms - Duration in milliseconds (absolute value)
 * @param compact - Use short format (2h 15m vs "2 hours 15 minutes")
 */
export function formatDuration(ms: number, compact: boolean = true): string {
  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    if (compact) {
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    return remainingHours > 0 ? `${days} day${days > 1 ? 's' : ''} ${remainingHours}h` : `${days} day${days > 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (compact) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return remainingMinutes > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  if (minutes > 0) {
    if (compact) {
      return `${minutes}m`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  if (compact) {
    return '<1m';
  }
  return 'less than a minute';
}

/**
 * Calculate time status for a task
 * @param dueDate - Due date string or Date object
 * @param completedAt - Completion date string or Date object (optional)
 * @param status - Current task status
 */
export function calculateTimeStatus(
  dueDate: string | Date | null | undefined,
  completedAt: string | Date | null | undefined,
  status: string
): TimeStatus | null {
  if (!dueDate) {
    return null;
  }

  const due = new Date(dueDate);
  const now = new Date();
  const isCompleted = ['DONE', 'COMPLETED', 'CANCELLED'].includes(status);
  
  if (isCompleted && completedAt) {
    // Task is completed - check if it was on time
    const completed = new Date(completedAt);
    const timeDiff = due.getTime() - completed.getTime();
    const isOnTime = completed <= due;
    const isEarly = timeDiff > 3600000; // More than 1 hour early
    
    return {
      isOverdue: !isOnTime,
      isCompletedOnTime: isOnTime,
      isCompletedEarly: isEarly,
      timeDiff,
      displayText: isOnTime 
        ? (isEarly ? `${formatDuration(timeDiff)} early` : 'On time')
        : `${formatDuration(-timeDiff)} late`,
      urgencyLevel: isEarly ? 'excellent' : (isOnTime ? 'success' : 'critical'),
    };
  }
  
  // Task is not completed - check remaining time or overdue
  const timeDiff = due.getTime() - now.getTime();
  const isOverdue = timeDiff < 0;
  
  // Determine urgency level based on remaining time
  let urgencyLevel: TimeStatus['urgencyLevel'] = 'normal';
  if (isOverdue) {
    urgencyLevel = Math.abs(timeDiff) > 86400000 ? 'critical' : 'warning'; // > 24h overdue = critical
  } else if (timeDiff < 3600000) {
    urgencyLevel = 'warning'; // Less than 1 hour remaining
  } else if (timeDiff < 14400000) {
    urgencyLevel = 'warning'; // Less than 4 hours remaining
  }
  
  return {
    isOverdue,
    isCompletedOnTime: false,
    isCompletedEarly: false,
    timeDiff,
    displayText: isOverdue 
      ? `${formatDuration(-timeDiff)} overdue`
      : `${formatDuration(timeDiff)} left`,
    urgencyLevel,
  };
}

/**
 * Get CSS classes based on time status
 */
export function getTimeStatusStyles(status: TimeStatus | null): {
  borderClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  iconColor: string;
} {
  if (!status) {
    return {
      borderClass: '',
      badgeBgClass: 'bg-gray-100 dark:bg-gray-700',
      badgeTextClass: 'text-gray-600 dark:text-gray-400',
      iconColor: 'text-gray-500',
    };
  }

  if (status.isCompletedEarly) {
    return {
      borderClass: 'border-amber-400 dark:border-amber-500',
      badgeBgClass: 'bg-amber-100 dark:bg-amber-500/20',
      badgeTextClass: 'text-amber-700 dark:text-amber-400',
      iconColor: 'text-amber-500',
    };
  }

  if (status.isCompletedOnTime) {
    return {
      borderClass: 'border-green-400 dark:border-green-500',
      badgeBgClass: 'bg-green-100 dark:bg-green-500/20',
      badgeTextClass: 'text-green-700 dark:text-green-400',
      iconColor: 'text-green-500',
    };
  }

  if (status.isOverdue) {
    if (status.urgencyLevel === 'critical') {
      return {
        borderClass: 'border-red-500 dark:border-red-500',
        badgeBgClass: 'bg-red-100 dark:bg-red-500/20',
        badgeTextClass: 'text-red-700 dark:text-red-400',
        iconColor: 'text-red-500',
      };
    }
    return {
      borderClass: 'border-orange-400 dark:border-orange-500',
      badgeBgClass: 'bg-orange-100 dark:bg-orange-500/20',
      badgeTextClass: 'text-orange-700 dark:text-orange-400',
      iconColor: 'text-orange-500',
    };
  }

  if (status.urgencyLevel === 'warning') {
    return {
      borderClass: 'border-yellow-400 dark:border-yellow-500',
      badgeBgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
      badgeTextClass: 'text-yellow-700 dark:text-yellow-400',
      iconColor: 'text-yellow-500',
    };
  }

  return {
    borderClass: '',
    badgeBgClass: 'bg-blue-100 dark:bg-blue-500/20',
    badgeTextClass: 'text-blue-700 dark:text-blue-400',
    iconColor: 'text-blue-500',
  };
}

/**
 * Calculate SLA compliance percentage
 */
export function calculateSLACompliance(tasks: Array<{
  dueDate?: string | Date | null;
  completedAt?: string | Date | null;
  status: string;
}>): {
  onTimeCount: number;
  lateCount: number;
  totalWithDueDate: number;
  compliancePercentage: number;
} {
  let onTimeCount = 0;
  let lateCount = 0;
  let totalWithDueDate = 0;

  for (const task of tasks) {
    if (!task.dueDate) continue;
    
    const status = calculateTimeStatus(task.dueDate, task.completedAt, task.status);
    if (!status) continue;
    
    totalWithDueDate++;
    
    const isCompleted = ['DONE', 'COMPLETED'].includes(task.status);
    
    if (isCompleted) {
      if (status.isCompletedOnTime) {
        onTimeCount++;
      } else {
        lateCount++;
      }
    } else if (status.isOverdue) {
      lateCount++;
    }
  }

  const compliancePercentage = totalWithDueDate > 0 
    ? Math.round((onTimeCount / totalWithDueDate) * 100) 
    : 100;

  return {
    onTimeCount,
    lateCount,
    totalWithDueDate,
    compliancePercentage,
  };
}

/**
 * Get performance badge based on SLA compliance
 */
export function getPerformanceBadge(compliancePercentage: number): {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
} {
  if (compliancePercentage >= 90) {
    return {
      label: 'Speedster',
      icon: '⚡',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-500/20',
    };
  }
  if (compliancePercentage >= 75) {
    return {
      label: 'On Track',
      icon: '🎯',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-500/20',
    };
  }
  if (compliancePercentage >= 50) {
    return {
      label: 'Needs Focus',
      icon: '📈',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-500/20',
    };
  }
  return {
    label: 'Needs Boost',
    icon: '🐢',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-500/20',
  };
}
