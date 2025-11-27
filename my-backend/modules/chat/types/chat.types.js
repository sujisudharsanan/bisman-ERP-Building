/**
 * BISMAN ERP - Intelligent Assistant Chat Types
 * Defines types for tone-based responses, quick actions, and structured replies
 */

/**
 * @typedef {'friendly' | 'alert' | 'error' | 'info'} Tone
 * Tone of the assistant's response to guide UI styling and emoji usage
 */

/**
 * @typedef {Object} QuickAction
 * @property {string} id - Unique identifier for the action (e.g., "generate_cod_report")
 * @property {string} label - Display text for the action button
 * @property {Object} [payload] - Optional data to pass back when action is clicked
 */

/**
 * @typedef {Object} ChatReply
 * @property {string} text - The main message content (supports multi-line with \n)
 * @property {Tone} tone - Tone/mood of the response
 * @property {QuickAction[]} [quickActions] - Optional action chips to display
 * @property {string} [contextInfo] - Optional context display (e.g., "Branch: Chennai · Module: COD")
 */

/**
 * @typedef {Object} ChatContext
 * @property {number} userId - User's ID from auth
 * @property {string} userName - User's display name
 * @property {string} [roleName] - User's role (e.g., "hub_incharge", "super_admin")
 * @property {number} [currentBranchId] - Current selected branch ID
 * @property {string} [currentBranchName] - Current branch name
 */

module.exports = {
  // Export empty object - types are for JSDoc only
};
