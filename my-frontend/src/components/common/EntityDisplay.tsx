/**
 * Entity Display Components
 * 
 * Reusable React components for displaying entities with
 * human-readable names and system-generated IDs.
 * 
 * Global UX Rule: Every identifiable entity must display
 * Name + ID in a consistent format.
 */

'use client';

import React from 'react';
import { 
  formatDisplayLabel, 
  formatUserLabel, 
  formatTaskLabel,
  formatEntityId,
  getUserDisplayName,
  type EntityType, 
  type DisplayFormat 
} from '@/lib/utils/entityDisplay';

// ============================================
// DISPLAY LABEL COMPONENT
// ============================================

interface DisplayLabelProps {
  /** Human-readable name */
  name: string;
  /** Entity ID (with or without prefix) */
  id: string | number;
  /** Type of entity for prefix generation */
  entityType?: EntityType;
  /** Display format */
  format?: DisplayFormat;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show ID in a subtle color */
  subtleId?: boolean;
  /** Whether to make the ID copyable on click */
  copyableId?: boolean;
  /** Icon to display before the label */
  icon?: React.ReactNode;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * DisplayLabel - Generic component for showing Name • ID format
 * 
 * @example
 * <DisplayLabel name="Ravi Kumar" id={10234} entityType="USER" />
 * // Renders: Ravi Kumar • U-10234
 */
export const DisplayLabel: React.FC<DisplayLabelProps> = ({
  name,
  id,
  entityType,
  format = 'primary',
  className = '',
  subtleId = true,
  copyableId = false,
  icon,
  size = 'sm',
}) => {
  const formattedId = formatEntityId(id, entityType);
  
  const handleCopyId = async (e: React.MouseEvent) => {
    if (copyableId) {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(formattedId);
        // Could add toast notification here
      } catch (err) {
        console.error('Failed to copy ID:', err);
      }
    }
  };

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const idSizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (format === 'badge') {
    return (
      <span 
        className={`
          inline-flex items-center px-2 py-0.5 rounded-md font-mono
          bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
          ${idSizeClasses[size]} ${className}
          ${copyableId ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : ''}
        `}
        onClick={handleCopyId}
        title={copyableId ? 'Click to copy ID' : formattedId}
      >
        {formattedId}
      </span>
    );
  }

  if (format === 'id-only') {
    return (
      <span 
        className={`
          font-mono text-gray-500 dark:text-gray-400
          ${idSizeClasses[size]} ${className}
          ${copyableId ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200' : ''}
        `}
        onClick={handleCopyId}
        title={copyableId ? 'Click to copy ID' : undefined}
      >
        {formattedId}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} ${className}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="font-medium text-gray-900 dark:text-white truncate">
        {name}
      </span>
      {format === 'primary' && (
        <>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span 
            className={`
              font-mono flex-shrink-0
              ${subtleId ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}
              ${idSizeClasses[size]}
              ${copyableId ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}
            `}
            onClick={handleCopyId}
            title={copyableId ? 'Click to copy ID' : undefined}
          >
            {formattedId}
          </span>
        </>
      )}
      {format === 'compact' && (
        <span 
          className={`
            font-mono flex-shrink-0
            ${subtleId ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}
            ${idSizeClasses[size]}
            ${copyableId ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}
          `}
          onClick={handleCopyId}
          title={copyableId ? 'Click to copy ID' : undefined}
        >
          ({formattedId})
        </span>
      )}
    </span>
  );
};

// ============================================
// USER LABEL COMPONENT
// ============================================

interface UserLabelProps {
  /** User object with id and name fields */
  user: {
    id: number | string;
    firstName?: string;
    lastName?: string;
    username?: string;
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
    roleName?: string;
  };
  /** Display format */
  format?: DisplayFormat;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show avatar */
  showAvatar?: boolean;
  /** Whether to show role badge */
  showRole?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether to make ID copyable */
  copyableId?: boolean;
}

/**
 * UserLabel - Display user with name and ID
 * 
 * @example
 * <UserLabel user={{ id: 10234, firstName: 'Ravi', lastName: 'Kumar' }} />
 * // Renders: Ravi Kumar • U-10234
 */
export const UserLabel: React.FC<UserLabelProps> = ({
  user,
  format = 'primary',
  className = '',
  showAvatar = false,
  showRole = false,
  size = 'sm',
  copyableId = false,
}) => {
  const displayName = getUserDisplayName(user);
  const formattedId = formatEntityId(user.id, 'USER');
  const initials = getInitials(displayName);

  const avatarSizes = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {showAvatar && (
        <span 
          className={`
            ${avatarSizes[size]} rounded-full flex-shrink-0
            bg-gray-200 dark:bg-gray-700 
            flex items-center justify-center 
            font-medium text-gray-600 dark:text-gray-300
          `}
          title={displayName}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </span>
      )}
      <DisplayLabel
        name={displayName}
        id={user.id}
        entityType="USER"
        format={format}
        size={size}
        copyableId={copyableId}
      />
      {showRole && (user.role || user.roleName) && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          {user.roleName || user.role}
        </span>
      )}
    </span>
  );
};

// ============================================
// TASK LABEL COMPONENT
// ============================================

interface TaskLabelProps {
  /** Task object */
  task: {
    id: number | string;
    title: string;
    unique_id?: string;
    serialNumber?: string;
    status?: string;
    priority?: string;
  };
  /** Display format */
  format?: DisplayFormat;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show status badge */
  showStatus?: boolean;
  /** Whether to show priority badge */
  showPriority?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether to make ID copyable */
  copyableId?: boolean;
  /** Whether to truncate title */
  truncate?: boolean;
  /** Max title length before truncation */
  maxTitleLength?: number;
}

/**
 * TaskLabel - Display task with title and ID
 * 
 * @example
 * <TaskLabel task={{ id: 78421, title: 'Vendor Payment Approval' }} />
 * // Renders: Vendor Payment Approval • TSK-78421
 */
export const TaskLabel: React.FC<TaskLabelProps> = ({
  task,
  format = 'primary',
  className = '',
  showStatus = false,
  showPriority = false,
  size = 'sm',
  copyableId = false,
  truncate = true,
  maxTitleLength = 50,
}) => {
  const taskId = task.unique_id || task.serialNumber || formatEntityId(task.id, 'TASK');
  const displayTitle = truncate && task.title.length > maxTitleLength 
    ? task.title.substring(0, maxTitleLength) + '...' 
    : task.title;

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const idSizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const handleCopyId = async (e: React.MouseEvent) => {
    if (copyableId) {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(taskId);
      } catch (err) {
        console.error('Failed to copy ID:', err);
      }
    }
  };

  if (format === 'badge') {
    return (
      <span 
        className={`
          inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold
          bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400
          ${idSizeClasses[size]} ${className}
          ${copyableId ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40' : ''}
        `}
        onClick={handleCopyId}
        title={copyableId ? 'Click to copy ID' : task.title}
      >
        {taskId}
      </span>
    );
  }

  if (format === 'id-only') {
    return (
      <span 
        className={`font-mono font-bold text-blue-600 dark:text-blue-400 ${idSizeClasses[size]} ${className}`}
        onClick={handleCopyId}
        title={copyableId ? 'Click to copy ID' : task.title}
      >
        [{taskId}]
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${sizeClasses[size]} ${className}`}>
      <span className="font-medium text-gray-900 dark:text-white" title={task.title}>
        {displayTitle}
      </span>
      {format === 'primary' && (
        <>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span 
            className={`
              font-mono font-semibold flex-shrink-0
              text-blue-600 dark:text-blue-400
              ${idSizeClasses[size]}
              ${copyableId ? 'cursor-pointer hover:text-blue-800 dark:hover:text-blue-300' : ''}
            `}
            onClick={handleCopyId}
            title={copyableId ? 'Click to copy ID' : undefined}
          >
            {taskId}
          </span>
        </>
      )}
      {format === 'compact' && (
        <span 
          className={`font-mono text-gray-500 dark:text-gray-400 ${idSizeClasses[size]}`}
          onClick={handleCopyId}
        >
          ({taskId})
        </span>
      )}
      {showStatus && task.status && (
        <StatusBadge status={task.status} size={size} />
      )}
      {showPriority && task.priority && (
        <PriorityBadge priority={task.priority} size={size} />
      )}
    </span>
  );
};

// ============================================
// TASK ID BADGE COMPONENT
// ============================================

interface TaskIdBadgeProps {
  /** Task ID (with or without prefix) */
  id: string | number;
  /** Unique ID if available */
  unique_id?: string;
  /** Serial number if available */
  serialNumber?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether to make ID copyable */
  copyable?: boolean;
}

/**
 * TaskIdBadge - Display just the task ID in a badge format
 * 
 * @example
 * <TaskIdBadge id={78421} />
 * // Renders: [TSK-78421]
 */
export const TaskIdBadge: React.FC<TaskIdBadgeProps> = ({
  id,
  unique_id,
  serialNumber,
  size = 'sm',
  className = '',
  copyable = true,
}) => {
  const taskId = unique_id || serialNumber || formatEntityId(id, 'TASK');

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1',
  };

  const handleCopy = async (e: React.MouseEvent) => {
    if (copyable) {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(taskId);
      } catch (err) {
        console.error('Failed to copy ID:', err);
      }
    }
  };

  return (
    <span 
      className={`
        inline-flex items-center rounded-md font-mono font-bold
        bg-blue-50 dark:bg-blue-900/20 
        text-blue-700 dark:text-blue-400
        border border-blue-200 dark:border-blue-800
        ${sizeClasses[size]}
        ${copyable ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors' : ''}
        ${className}
      `}
      onClick={handleCopy}
      title={copyable ? `Click to copy: ${taskId}` : taskId}
    >
      {taskId}
    </span>
  );
};

// ============================================
// CLIENT LABEL COMPONENT
// ============================================

interface ClientLabelProps {
  /** Client object */
  client: {
    id: number | string;
    name: string;
    companyName?: string;
  };
  /** Display format */
  format?: DisplayFormat;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether to make ID copyable */
  copyableId?: boolean;
}

/**
 * ClientLabel - Display client with name and ID
 * 
 * @example
 * <ClientLabel client={{ id: 987, name: 'Acme Logistics Pvt Ltd' }} />
 * // Renders: Acme Logistics Pvt Ltd • CL-00987
 */
export const ClientLabel: React.FC<ClientLabelProps> = ({
  client,
  format = 'primary',
  className = '',
  size = 'sm',
  copyableId = false,
}) => {
  const displayName = client.companyName || client.name;
  
  return (
    <DisplayLabel
      name={displayName}
      id={client.id}
      entityType="CLIENT"
      format={format}
      size={size}
      copyableId={copyableId}
      className={className}
    />
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    IN_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  const sizeClasses = {
    xs: 'text-[9px] px-1 py-0.5',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <span className={`rounded-full font-medium uppercase ${statusColors[status] || statusColors.DRAFT} ${sizeClasses[size]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CRITICAL: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  const sizeClasses = {
    xs: 'text-[9px] px-1 py-0.5',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <span className={`rounded-full font-medium uppercase ${priorityColors[priority] || priorityColors.MEDIUM} ${sizeClasses[size]}`}>
      {priority}
    </span>
  );
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

// ============================================
// EXPORTS
// ============================================

export {
  StatusBadge,
  PriorityBadge,
  getInitials,
};
