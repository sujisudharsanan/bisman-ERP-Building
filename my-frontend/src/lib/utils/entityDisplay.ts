/**
 * Entity Display Utilities
 * 
 * Global UX Rule: Every identifiable entity must display
 * Human-readable Name + System-generated ID
 * 
 * This applies across:
 * - UI (tables, cards, modals, dropdowns, tooltips)
 * - Notifications
 * - Audit logs
 * - APIs (response payloads)
 * - Exports (CSV, PDF)
 * - Search results
 */

// ============================================
// ENTITY PREFIXES
// ============================================

export const EntityPrefix = {
  USER: 'U-',
  TASK: 'TSK-',
  CLIENT: 'CL-',
  TENANT: 'CL-',
  ROLE: 'R-',
  DEPARTMENT: 'DPT-',
  APPROVAL: 'APR-',
  TICKET: 'Q-',
  QUERY: 'Q-',
  ORGANIZATION: 'ORG-',
  VENDOR: 'VND-',
  INVOICE: 'INV-',
  PAYMENT: 'PAY-',
  ORDER: 'ORD-',
  PRODUCT: 'PRD-',
  NOTIFICATION: 'NTF-',
  AUDIT: 'AUD-',
  SESSION: 'SES-',
  REPORT: 'RPT-',
  WORKFLOW: 'WF-',
  CLARIFICATION: 'CLR-',
} as const;

export type EntityType = keyof typeof EntityPrefix;

// ============================================
// DISPLAY FORMATS
// ============================================

export type DisplayFormat = 'primary' | 'compact' | 'badge' | 'id-only';

/**
 * Format display label for an entity
 * 
 * @param name - Human-readable name
 * @param id - Entity ID (with or without prefix)
 * @param entityType - Type of entity for prefix generation
 * @param format - Display format to use
 * @returns Formatted display label
 * 
 * @example
 * formatDisplayLabel('Ravi Kumar', 10234, 'USER') 
 * // => 'Ravi Kumar • U-10234'
 * 
 * formatDisplayLabel('Vendor Payment Approval', 78421, 'TASK')
 * // => 'Vendor Payment Approval • TSK-78421'
 */
export function formatDisplayLabel(
  name: string,
  id: string | number,
  entityType?: EntityType,
  format: DisplayFormat = 'primary'
): string {
  const formattedId = formatEntityId(id, entityType);
  
  switch (format) {
    case 'primary':
      return `${name} • ${formattedId}`;
    case 'compact':
      return `${name} (${formattedId})`;
    case 'badge':
      return formattedId;
    case 'id-only':
      return formattedId;
    default:
      return `${name} • ${formattedId}`;
  }
}

/**
 * Format an entity ID with appropriate prefix
 * 
 * @param id - Raw ID (string or number)
 * @param entityType - Type of entity for prefix
 * @returns Formatted ID with prefix
 * 
 * @example
 * formatEntityId(10234, 'USER') // => 'U-10234'
 * formatEntityId('TSK-78421', 'TASK') // => 'TSK-78421' (already prefixed)
 */
export function formatEntityId(
  id: string | number,
  entityType?: EntityType
): string {
  const idStr = String(id);
  
  // If already has a recognized prefix, return as-is
  const prefixes = Object.values(EntityPrefix);
  if (prefixes.some(prefix => idStr.startsWith(prefix))) {
    return idStr;
  }
  
  // Apply prefix if entity type is provided
  if (entityType && EntityPrefix[entityType]) {
    const prefix = EntityPrefix[entityType];
    // Pad numeric IDs for consistency
    const paddedId = isNaN(Number(idStr)) ? idStr : String(id).padStart(5, '0');
    return `${prefix}${paddedId}`;
  }
  
  return idStr;
}

/**
 * Format user display label
 * Convenience function for user entities
 */
export function formatUserLabel(
  user: {
    id: number | string;
    firstName?: string;
    lastName?: string;
    username?: string;
    name?: string;
  },
  format: DisplayFormat = 'primary'
): string {
  const name = getUserDisplayName(user);
  return formatDisplayLabel(name, user.id, 'USER', format);
}

/**
 * Get user's display name from various possible fields
 */
export function getUserDisplayName(user: {
  firstName?: string;
  lastName?: string;
  username?: string;
  name?: string;
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.name) {
    return user.name;
  }
  return user.username || 'Unknown User';
}

/**
 * Format task display label
 * Uses unique_id or serialNumber if available, falls back to formatted id
 */
export function formatTaskLabel(
  task: {
    id: number | string;
    title: string;
    unique_id?: string;
    serialNumber?: string;
  },
  format: DisplayFormat = 'primary'
): string {
  const taskId = task.unique_id || task.serialNumber || formatEntityId(task.id, 'TASK');
  
  switch (format) {
    case 'primary':
      return `${task.title} • ${taskId}`;
    case 'compact':
      return `${task.title} (${taskId})`;
    case 'badge':
      return taskId;
    case 'id-only':
      return taskId;
    default:
      return `${task.title} • ${taskId}`;
  }
}

/**
 * Format client/tenant display label
 */
export function formatClientLabel(
  client: {
    id: number | string;
    name: string;
    companyName?: string;
  },
  format: DisplayFormat = 'primary'
): string {
  const displayName = client.companyName || client.name;
  return formatDisplayLabel(displayName, client.id, 'CLIENT', format);
}

/**
 * Format approval instance display label
 */
export function formatApprovalLabel(
  approval: {
    id: number | string;
    title?: string;
    type?: string;
  },
  format: DisplayFormat = 'primary'
): string {
  const name = approval.title || approval.type || 'Approval Request';
  return formatDisplayLabel(name, approval.id, 'APPROVAL', format);
}

/**
 * Format department display label
 */
export function formatDepartmentLabel(
  department: {
    id: number | string;
    name: string;
    code?: string;
  },
  format: DisplayFormat = 'primary'
): string {
  const deptId = department.code || formatEntityId(department.id, 'DEPARTMENT');
  
  switch (format) {
    case 'primary':
      return `${department.name} • ${deptId}`;
    case 'compact':
      return `${department.name} (${deptId})`;
    case 'badge':
      return deptId;
    case 'id-only':
      return deptId;
    default:
      return `${department.name} • ${deptId}`;
  }
}

/**
 * Format role display label
 */
export function formatRoleLabel(
  role: {
    id: number | string;
    name: string;
    code?: string;
  },
  format: DisplayFormat = 'primary'
): string {
  const roleId = role.code ? `R-${role.code}` : formatEntityId(role.id, 'ROLE');
  
  switch (format) {
    case 'primary':
      return `${role.name} • ${roleId}`;
    case 'compact':
      return `${role.name} (${roleId})`;
    case 'badge':
      return roleId;
    case 'id-only':
      return roleId;
    default:
      return `${role.name} • ${roleId}`;
  }
}

/**
 * Format clarification display label
 */
export function formatClarificationLabel(
  clarification: {
    id: number | string;
    taskTitle?: string;
    question?: string;
  },
  format: DisplayFormat = 'primary'
): string {
  const name = clarification.taskTitle || 
               (clarification.question ? clarification.question.substring(0, 30) + '...' : 'Clarification');
  return formatDisplayLabel(name, clarification.id, 'CLARIFICATION', format);
}

/**
 * Extract entity ID from a formatted display label
 * Useful for search and filtering
 * 
 * @param displayLabel - Formatted display label
 * @returns The ID portion of the label
 * 
 * @example
 * extractIdFromLabel('Ravi Kumar • U-10234') // => 'U-10234'
 * extractIdFromLabel('Task (TSK-00123)') // => 'TSK-00123'
 */
export function extractIdFromLabel(displayLabel: string): string | null {
  // Match primary format: Name • ID
  const primaryMatch = displayLabel.match(/•\s*(\S+)$/);
  if (primaryMatch) return primaryMatch[1];
  
  // Match compact format: Name (ID)
  const compactMatch = displayLabel.match(/\(([^)]+)\)$/);
  if (compactMatch) return compactMatch[1];
  
  // Match badge format: Just the ID with prefix
  const prefixes = Object.values(EntityPrefix);
  for (const prefix of prefixes) {
    if (displayLabel.startsWith(prefix)) {
      return displayLabel;
    }
  }
  
  return null;
}

/**
 * Check if a search query matches an entity by name or ID
 * Supports partial ID matching
 * 
 * @param entity - Entity object with name and id
 * @param query - Search query string
 * @param entityType - Type of entity for ID formatting
 * @returns Whether the entity matches the search query
 * 
 * @example
 * matchesSearch({ name: 'Ravi Kumar', id: 10234 }, 'ravi', 'USER') // => true
 * matchesSearch({ name: 'Ravi Kumar', id: 10234 }, '102', 'USER') // => true
 * matchesSearch({ name: 'Ravi Kumar', id: 10234 }, 'U-102', 'USER') // => true
 */
export function matchesSearch(
  entity: { name?: string; title?: string; id: number | string },
  query: string,
  entityType?: EntityType
): boolean {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return true;
  
  // Match by name
  const name = entity.name || entity.title || '';
  if (name.toLowerCase().includes(lowerQuery)) {
    return true;
  }
  
  // Match by ID (various formats)
  const idStr = String(entity.id);
  const formattedId = formatEntityId(entity.id, entityType).toLowerCase();
  
  // Direct ID match
  if (idStr.includes(lowerQuery)) {
    return true;
  }
  
  // Formatted ID match (e.g., "U-102" matches "U-10234")
  if (formattedId.includes(lowerQuery)) {
    return true;
  }
  
  // Partial ID match without prefix
  const queryWithoutPrefix = lowerQuery.replace(/^[a-z]+-/i, '');
  if (idStr.includes(queryWithoutPrefix)) {
    return true;
  }
  
  return false;
}

// ============================================
// TYPE DEFINITIONS FOR API RESPONSES
// ============================================

/**
 * Base interface for entities with display labels
 * All API responses should include displayLabel
 */
export interface DisplayLabelEntity {
  id: string | number;
  displayLabel: string;
}

/**
 * User entity with display label
 */
export interface UserWithLabel extends DisplayLabelEntity {
  username: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  roleName?: string;
}

/**
 * Task entity with display label
 */
export interface TaskWithLabel extends DisplayLabelEntity {
  title: string;
  unique_id?: string;
  serialNumber?: string;
  status?: string;
  priority?: string;
}

/**
 * Client entity with display label
 */
export interface ClientWithLabel extends DisplayLabelEntity {
  name: string;
  companyName?: string;
}

/**
 * Generate displayLabel for API response
 * Call this in backend before returning entity
 */
export function addDisplayLabel<T extends { id: number | string; name?: string; title?: string }>(
  entity: T,
  entityType: EntityType
): T & { displayLabel: string } {
  const name = entity.name || entity.title || '';
  return {
    ...entity,
    displayLabel: formatDisplayLabel(name, entity.id, entityType),
  };
}
