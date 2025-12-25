/**
 * Unified Dashboard Configuration
 * 
 * Single source of truth for all role-based dashboard configurations.
 * This replaces 24+ separate dashboard pages with one dynamic solution.
 */

export interface ColumnConfig {
  key: string;
  title: string;
  dataKey: string;
  showCreate?: boolean;
}

export interface RoleConfig {
  /** Display name for the role */
  displayName: string;
  /** Kanban columns to show */
  columns: ColumnConfig[];
  /** Loading spinner color class */
  accentColor: string;
  /** Loading text */
  loadingText: string;
  /** Show right panel */
  showRightPanel: boolean;
  /** Use workflow tasks hook instead of standard dashboard data */
  useWorkflowTasks?: boolean;
  /** Show task creation form modal */
  allowTaskCreation?: boolean;
  /** Custom welcome message */
  welcomeMessage?: string;
}

// Standard 4-column Kanban layout (most roles use this)
const STANDARD_COLUMNS: ColumnConfig[] = [
  { key: 'assigned', title: 'ASSIGNED', dataKey: 'ASSIGNED', showCreate: true },
  { key: 'inProgress', title: 'IN PROGRESS', dataKey: 'IN_PROGRESS' },
  { key: 'needAttention', title: 'NEED ATTENTION', dataKey: 'EDITING' },
  { key: 'done', title: 'DONE', dataKey: 'DONE' },
];

// Workflow-based columns (for hub/store incharge)
const WORKFLOW_COLUMNS: ColumnConfig[] = [
  { key: 'assigned', title: 'ASSIGNED', dataKey: 'ASSIGNED', showCreate: true },
  { key: 'inProgress', title: 'IN PROGRESS', dataKey: 'IN_PROGRESS' },
  { key: 'needAttention', title: 'NEED ATTENTION', dataKey: 'EDITING' },
  { key: 'done', title: 'DONE', dataKey: 'DONE' },
];

/**
 * Role-specific dashboard configurations
 */
export const DASHBOARD_CONFIGS: Record<string, RoleConfig> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATIONS ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  HUB_INCHARGE: {
    displayName: 'Hub In-Charge',  // Updated: was "Hub Incharge"
    columns: WORKFLOW_COLUMNS,
    accentColor: 'border-blue-500',
    loadingText: 'Loading Hub Dashboard...',
    showRightPanel: true,
    useWorkflowTasks: true,
    allowTaskCreation: true,
    welcomeMessage: 'Welcome to your Hub Operations Dashboard',
  },
  
  STORE_INCHARGE: {
    displayName: 'Store In-Charge',
    columns: WORKFLOW_COLUMNS,
    accentColor: 'border-cyan-500',
    loadingText: 'Loading Store Dashboard...',
    showRightPanel: true,
    useWorkflowTasks: true,
    allowTaskCreation: true,
    welcomeMessage: 'Welcome to your Store Operations Dashboard',
  },
  
  BRANCH_INCHARGE: {
    displayName: 'Branch Manager',  // Updated: was "Branch Incharge"
    columns: WORKFLOW_COLUMNS,
    accentColor: 'border-indigo-500',
    loadingText: 'Loading Branch Dashboard...',
    showRightPanel: true,
    useWorkflowTasks: true,
    allowTaskCreation: true,
    welcomeMessage: 'Welcome to your Branch Operations Dashboard',
  },
  
  BRANCH_MANAGER: {
    displayName: 'Regional Manager',  // Level 75: Multi-branch authority
    columns: STANDARD_COLUMNS,
    accentColor: 'border-purple-500',
    loadingText: 'Loading Regional Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
    welcomeMessage: 'Welcome to your Regional Operations Dashboard',
  },
  
  OPERATIONS_MANAGER: {
    displayName: 'General Manager',  // Level 80: Cross-region authority
    columns: STANDARD_COLUMNS,
    accentColor: 'border-emerald-500',
    loadingText: 'Loading General Manager Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  WAREHOUSE_MANAGER: {
    displayName: 'Warehouse Manager',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-amber-500',
    loadingText: 'Loading Warehouse Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  LOGISTICS_MANAGER: {
    displayName: 'Logistics Manager',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-orange-500',
    loadingText: 'Loading Logistics Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  INVENTORY_CONTROLLER: {
    displayName: 'Inventory Controller',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-teal-500',
    loadingText: 'Loading Inventory Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  CFO: {
    displayName: 'Chief Financial Officer',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-purple-500',
    loadingText: 'Loading CFO Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
    welcomeMessage: 'Welcome to your Executive Finance Dashboard',
  },
  
  FINANCE_CONTROLLER: {
    displayName: 'Finance Controller',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-violet-500',
    loadingText: 'Loading Finance Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  TREASURY: {
    displayName: 'Treasury',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-indigo-500',
    loadingText: 'Loading Treasury Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  ACCOUNTS: {
    displayName: 'Accounts',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-blue-500',
    loadingText: 'Loading Accounts Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  ACCOUNTS_PAYABLE: {
    displayName: 'Accounts Payable',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-sky-500',
    loadingText: 'Loading AP Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  ACCOUNTS_RECEIVABLE: {
    displayName: 'Accounts Receivable',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-cyan-500',
    loadingText: 'Loading AR Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  BANKER: {
    displayName: 'Banker',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-slate-500',
    loadingText: 'Loading Banking Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROCUREMENT ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  PROCUREMENT_OFFICER: {
    displayName: 'Procurement Officer',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-rose-500',
    loadingText: 'Loading Procurement Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  PROCUREMENT_HEAD: {
    displayName: 'Procurement Head',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-pink-500',
    loadingText: 'Loading Procurement Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  PROCUREMENT_MANAGER: {
    displayName: 'Procurement Manager',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-fuchsia-500',
    loadingText: 'Loading Procurement Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  SUPPLIER_MANAGER: {
    displayName: 'Supplier Manager',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-red-500',
    loadingText: 'Loading Supplier Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE & LEGAL ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  COMPLIANCE: {
    displayName: 'Compliance',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-yellow-500',
    loadingText: 'Loading Compliance Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  COMPLIANCE_OFFICER: {
    displayName: 'Compliance Officer',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-amber-500',
    loadingText: 'Loading Compliance Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  LEGAL: {
    displayName: 'Legal',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-stone-500',
    loadingText: 'Loading Legal Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  LEGAL_HEAD: {
    displayName: 'Legal Head',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-neutral-500',
    loadingText: 'Loading Legal Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  RISK_MANAGER: {
    displayName: 'Risk Manager',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-orange-500',
    loadingText: 'Loading Risk Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF & OTHER ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  STAFF: {
    displayName: 'Staff',
    columns: WORKFLOW_COLUMNS,
    accentColor: 'border-green-500',
    loadingText: 'Loading Staff Dashboard...',
    showRightPanel: true,
    useWorkflowTasks: true,
    allowTaskCreation: false,
  },
  
  MANAGER: {
    displayName: 'Manager',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-blue-500',
    loadingText: 'Loading Manager Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  IT_ADMIN: {
    displayName: 'IT Administrator',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-gray-500',
    loadingText: 'Loading IT Dashboard...',
    showRightPanel: true,
    allowTaskCreation: true,
  },
  
  // Default configuration for unknown roles
  DEFAULT: {
    displayName: 'User',
    columns: STANDARD_COLUMNS,
    accentColor: 'border-blue-500',
    loadingText: 'Loading Dashboard...',
    showRightPanel: true,
    allowTaskCreation: false,
  },
};

/**
 * Get dashboard configuration for a role
 * Handles role name normalization (spaces, underscores, case)
 */
export function getDashboardConfig(roleName?: string | null): RoleConfig {
  if (!roleName) return DASHBOARD_CONFIGS.DEFAULT;
  
  // Normalize role name: uppercase, replace spaces with underscores
  const normalizedRole = roleName.toUpperCase().replace(/\s+/g, '_');
  
  return DASHBOARD_CONFIGS[normalizedRole] || DASHBOARD_CONFIGS.DEFAULT;
}

/**
 * Check if a role should be redirected to admin dashboards
 * (These roles have their own specialized dashboards)
 */
export function isAdminRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.toUpperCase().replace(/\s+/g, '_');
  return ['ADMIN', 'SYSTEM_ADMINISTRATOR'].includes(normalized);
}

/**
 * Check if a role should be redirected to super admin dashboard
 */
export function isSuperAdminRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.toUpperCase().replace(/\s+/g, '_');
  return normalized === 'SUPER_ADMIN';
}

/**
 * Check if a role should be redirected to enterprise admin dashboard
 */
export function isEnterpriseAdminRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.toUpperCase().replace(/\s+/g, '_');
  return normalized === 'ENTERPRISE_ADMIN';
}

/**
 * Get all supported role names
 */
export function getSupportedRoles(): string[] {
  return Object.keys(DASHBOARD_CONFIGS).filter(key => key !== 'DEFAULT');
}
