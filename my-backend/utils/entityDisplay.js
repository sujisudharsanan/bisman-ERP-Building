/**
 * Entity Display Utilities (Backend)
 * 
 * Global UX Rule: Every identifiable entity must include
 * a displayLabel field in API responses.
 * 
 * Format: "Human-readable Name • System-generated ID"
 * 
 * This applies to all entity API responses:
 * - Users, Tasks, Clients, Departments, Roles, etc.
 */

// ============================================
// ENTITY PREFIXES
// ============================================

const EntityPrefix = {
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
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Format an entity ID with appropriate prefix
 * 
 * @param {string|number} id - Raw ID
 * @param {string} [entityType] - Type of entity for prefix
 * @returns {string} Formatted ID with prefix
 * 
 * @example
 * formatEntityId(10234, 'USER') // => 'U-10234'
 * formatEntityId('TSK-78421', 'TASK') // => 'TSK-78421' (already prefixed)
 */
function formatEntityId(id, entityType) {
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
 * Format display label for an entity
 * 
 * @param {string} name - Human-readable name
 * @param {string|number} id - Entity ID
 * @param {string} [entityType] - Type of entity for prefix
 * @returns {string} Formatted display label
 * 
 * @example
 * formatDisplayLabel('Ravi Kumar', 10234, 'USER') 
 * // => 'Ravi Kumar • U-10234'
 */
function formatDisplayLabel(name, id, entityType) {
  const formattedId = formatEntityId(id, entityType);
  return `${name} • ${formattedId}`;
}

/**
 * Get user's display name from various possible fields
 * 
 * @param {Object} user - User object
 * @returns {string} Display name
 */
function getUserDisplayName(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.name) {
    return user.name;
  }
  return user.username || user.email || 'Unknown User';
}

/**
 * Add displayLabel field to a user entity
 * 
 * @param {Object} user - User object
 * @returns {Object} User with displayLabel added
 */
function addUserDisplayLabel(user) {
  if (!user) return user;
  
  const displayName = getUserDisplayName(user);
  const displayLabel = formatDisplayLabel(displayName, user.id, 'USER');
  
  return {
    ...user,
    displayLabel,
  };
}

/**
 * Add displayLabel field to a task entity
 * 
 * @param {Object} task - Task object
 * @returns {Object} Task with displayLabel added
 */
function addTaskDisplayLabel(task) {
  if (!task) return task;
  
  const taskId = task.unique_id || task.serialNumber || formatEntityId(task.id, 'TASK');
  const displayLabel = `${task.title} • ${taskId}`;
  
  // Also add displayLabel to nested user objects
  const result = {
    ...task,
    displayLabel,
  };
  
  if (task.assignee) {
    result.assignee = addUserDisplayLabel(task.assignee);
  }
  if (task.creator) {
    result.creator = addUserDisplayLabel(task.creator);
  }
  if (task.approver) {
    result.approver = addUserDisplayLabel(task.approver);
  }
  
  return result;
}

/**
 * Add displayLabel field to a client entity
 * 
 * @param {Object} client - Client object
 * @returns {Object} Client with displayLabel added
 */
function addClientDisplayLabel(client) {
  if (!client) return client;
  
  const displayName = client.companyName || client.company_name || client.name;
  const displayLabel = formatDisplayLabel(displayName, client.id, 'CLIENT');
  
  return {
    ...client,
    displayLabel,
  };
}

/**
 * Add displayLabel field to a department entity
 * 
 * @param {Object} department - Department object
 * @returns {Object} Department with displayLabel added
 */
function addDepartmentDisplayLabel(department) {
  if (!department) return department;
  
  const deptId = department.code || formatEntityId(department.id, 'DEPARTMENT');
  const displayLabel = `${department.name} • ${deptId}`;
  
  return {
    ...department,
    displayLabel,
  };
}

/**
 * Add displayLabel field to a role entity
 * 
 * @param {Object} role - Role object
 * @returns {Object} Role with displayLabel added
 */
function addRoleDisplayLabel(role) {
  if (!role) return role;
  
  const roleId = role.code ? `R-${role.code}` : formatEntityId(role.id, 'ROLE');
  const displayLabel = `${role.name} • ${roleId}`;
  
  return {
    ...role,
    displayLabel,
  };
}

/**
 * Add displayLabel to an array of entities
 * 
 * @param {Array} entities - Array of entity objects
 * @param {string} entityType - Type of entity
 * @param {string} [nameField='name'] - Field to use for display name
 * @returns {Array} Entities with displayLabel added
 */
function addDisplayLabelsToArray(entities, entityType, nameField = 'name') {
  if (!Array.isArray(entities)) return entities;
  
  return entities.map(entity => {
    const name = entity[nameField] || entity.title || entity.name || '';
    const displayLabel = formatDisplayLabel(name, entity.id, entityType);
    return { ...entity, displayLabel };
  });
}

/**
 * Generic function to add displayLabel to any entity
 * 
 * @param {Object} entity - Entity object
 * @param {string} entityType - Type of entity
 * @param {string} [nameField='name'] - Field to use for display name
 * @returns {Object} Entity with displayLabel added
 */
function addDisplayLabel(entity, entityType, nameField = 'name') {
  if (!entity) return entity;
  
  const name = entity[nameField] || entity.title || entity.name || '';
  const displayLabel = formatDisplayLabel(name, entity.id, entityType);
  
  return {
    ...entity,
    displayLabel,
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  EntityPrefix,
  formatEntityId,
  formatDisplayLabel,
  getUserDisplayName,
  addUserDisplayLabel,
  addTaskDisplayLabel,
  addClientDisplayLabel,
  addDepartmentDisplayLabel,
  addRoleDisplayLabel,
  addDisplayLabelsToArray,
  addDisplayLabel,
};
