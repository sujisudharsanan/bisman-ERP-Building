// Task Workflow State Machine
// Handles state transitions and approval chain logic

const TASK_STATUSES = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  EDITING: 'editing',
  DONE: 'done'
};

const APPROVER_ROLES = {
  OPERATION_MANAGER: 'operation_manager',
  ACCOUNTS: 'accounts',
  ACCOUNT_PAYABLE: 'account_payable',
  BANKER: 'banker'
};

const APPROVAL_LEVELS = {
  NONE: 0,
  OPERATION_MANAGER: 1,
  ACCOUNTS: 2,
  ACCOUNT_PAYABLE: 3,
  BANKER: 4,
  FINAL: 5
};

// Allowed status transitions
const ALLOWED_TRANSITIONS = {
  [TASK_STATUSES.DRAFT]: [TASK_STATUSES.CONFIRMED],
  [TASK_STATUSES.CONFIRMED]: [TASK_STATUSES.IN_PROGRESS],
  [TASK_STATUSES.IN_PROGRESS]: [TASK_STATUSES.DONE, TASK_STATUSES.EDITING],
  [TASK_STATUSES.EDITING]: [TASK_STATUSES.IN_PROGRESS],
  [TASK_STATUSES.DONE]: [] // Terminal state
};

/**
 * Check if a status transition is allowed
 */
function canTransition(fromStatus, toStatus) {
  const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowedNext.includes(toStatus);
}

/**
 * Validate if user can perform action based on their role
 */
function canPerformAction(action, task, user, approvers) {
  const { status, creator_id, creator_type, current_approver_level } = task;
  const { id: userId, userType, role } = user;

  // Creator can confirm their own draft
  if (action === 'confirm') {
    return status === TASK_STATUSES.DRAFT && 
           creator_id === userId && 
           creator_type === userType;
  }

  // Creator/Editor can resubmit from editing
  if (action === 'resubmit') {
    return status === TASK_STATUSES.EDITING && 
           creator_id === userId && 
           creator_type === userType;
  }

  // Approve/Reject requires approver role
  if (action === 'approve' || action === 'reject') {
    if (status !== TASK_STATUSES.IN_PROGRESS) return false;
    
    // Find approver at current level
    const currentApprover = approvers.find(
      a => a.approval_level === current_approver_level && a.is_active
    );
    
    if (!currentApprover) return false;
    
    // Check if this user is the current approver
    return currentApprover.user_id === userId && 
           currentApprover.user_type === userType;
  }

  return false;
}

/**
 * Get next approver in the chain
 */
function getNextApprover(currentLevel, approvers) {
  const nextLevel = currentLevel + 1;
  
  // If we've reached the final level, no next approver
  if (nextLevel > APPROVAL_LEVELS.BANKER) {
    return null;
  }
  
  // Find active approver at next level
  const nextApprover = approvers.find(
    a => a.approval_level === nextLevel && a.is_active
  );
  
  return nextApprover || null;
}

/**
 * Process task transition
 */
async function processTransition(action, task, user, comment, approvers) {
  const { status, current_approver_level } = task;
  let newStatus = status;
  let newApproverLevel = current_approver_level;
  let nextApprover = null;

  switch (action) {
    case 'confirm':
      // Draft → Confirmed → In Progress with first approver
      if (status === TASK_STATUSES.DRAFT) {
        newStatus = TASK_STATUSES.IN_PROGRESS;
        newApproverLevel = APPROVAL_LEVELS.OPERATION_MANAGER;
        nextApprover = approvers.find(
          a => a.approval_level === APPROVAL_LEVELS.OPERATION_MANAGER && a.is_active
        );
      }
      break;

    case 'approve':
      // In Progress → check if more approvers needed
      if (status === TASK_STATUSES.IN_PROGRESS) {
        const next = getNextApprover(current_approver_level, approvers);
        
        if (next) {
          // More approvals needed, stay in IN_PROGRESS
          newStatus = TASK_STATUSES.IN_PROGRESS;
          newApproverLevel = next.approval_level;
          nextApprover = next;
        } else {
          // Final approval, move to DONE
          newStatus = TASK_STATUSES.DONE;
          newApproverLevel = APPROVAL_LEVELS.FINAL;
          nextApprover = null;
        }
      }
      break;

    case 'reject':
      // In Progress → Editing
      if (status === TASK_STATUSES.IN_PROGRESS) {
        newStatus = TASK_STATUSES.EDITING;
        // Keep same approver level for when they resubmit
        newApproverLevel = current_approver_level;
      }
      break;

    case 'resubmit':
      // Editing → back to In Progress with same approver
      if (status === TASK_STATUSES.EDITING) {
        newStatus = TASK_STATUSES.IN_PROGRESS;
        // Keep the same approver level (they need to review again)
        nextApprover = approvers.find(
          a => a.approval_level === current_approver_level && a.is_active
        );
      }
      break;

    case 'complete':
      // Manual completion (if allowed by role)
      if (status === TASK_STATUSES.IN_PROGRESS) {
        newStatus = TASK_STATUSES.DONE;
        newApproverLevel = APPROVAL_LEVELS.FINAL;
      }
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  // Validate transition is allowed
  if (newStatus !== status && !canTransition(status, newStatus)) {
    throw new Error(`Transition from ${status} to ${newStatus} is not allowed`);
  }

  return {
    newStatus,
    newApproverLevel,
    nextApprover: nextApprover ? {
      id: nextApprover.user_id,
      type: nextApprover.user_type,
      name: nextApprover.user_name,
      role: nextApprover.approver_role,
      level: nextApprover.approval_level
    } : null
  };
}

/**
 * Get approver role name from level
 */
function getApproverRoleName(level) {
  const roleMap = {
    [APPROVAL_LEVELS.OPERATION_MANAGER]: APPROVER_ROLES.OPERATION_MANAGER,
    [APPROVAL_LEVELS.ACCOUNTS]: APPROVER_ROLES.ACCOUNTS,
    [APPROVAL_LEVELS.ACCOUNT_PAYABLE]: APPROVER_ROLES.ACCOUNT_PAYABLE,
    [APPROVAL_LEVELS.BANKER]: APPROVER_ROLES.BANKER
  };
  return roleMap[level] || null;
}

/**
 * Get human-readable approver role label
 */
function getApproverRoleLabel(role) {
  const labels = {
    [APPROVER_ROLES.OPERATION_MANAGER]: 'Operation Manager',
    [APPROVER_ROLES.ACCOUNTS]: 'Accounts',
    [APPROVER_ROLES.ACCOUNT_PAYABLE]: 'Accounts Payable',
    [APPROVER_ROLES.BANKER]: 'Banker'
  };
  return labels[role] || role;
}

/**
 * Get task status color
 */
function getStatusColor(status) {
  const colors = {
    [TASK_STATUSES.DRAFT]: '#6B7280', // gray
    [TASK_STATUSES.CONFIRMED]: '#3B82F6', // blue
    [TASK_STATUSES.IN_PROGRESS]: '#F59E0B', // amber
    [TASK_STATUSES.EDITING]: '#EF4444', // red
    [TASK_STATUSES.DONE]: '#10B981' // green
  };
  return colors[status] || '#6B7280';
}

/**
 * Get available actions for a task based on user role and task status
 */
function getAvailableActions(task, user, approvers) {
  const actions = [];
  
  if (canPerformAction('confirm', task, user, approvers)) {
    actions.push({ action: 'confirm', label: 'Confirm', color: 'blue' });
  }
  
  if (canPerformAction('approve', task, user, approvers)) {
    actions.push({ action: 'approve', label: 'Approve', color: 'green' });
  }
  
  if (canPerformAction('reject', task, user, approvers)) {
    actions.push({ action: 'reject', label: 'Reject', color: 'red' });
  }
  
  if (canPerformAction('resubmit', task, user, approvers)) {
    actions.push({ action: 'resubmit', label: 'Resubmit', color: 'blue' });
  }
  
  return actions;
}

module.exports = {
  TASK_STATUSES,
  APPROVER_ROLES,
  APPROVAL_LEVELS,
  ALLOWED_TRANSITIONS,
  canTransition,
  canPerformAction,
  getNextApprover,
  processTransition,
  getApproverRoleName,
  getApproverRoleLabel,
  getStatusColor,
  getAvailableActions
};
