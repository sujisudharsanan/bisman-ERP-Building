/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CENTRALIZED PAGE REGISTRY - BISMAN ERP
  path: '/pump-management/server-logs',
 * 
 * This file is the SINGLE SOURCE OF TRUTH for all ERP pages, routes, and navigation.
 * It maps all pages to their routes, permissions, roles, icons, and metadata.
 * The DynamicSidebar component automatically generates navigation from this registry.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 BEFORE ADDING A NEW PAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. ✅ Check if the page already exists
 *    - Use Ctrl+F (or Cmd+F) to search PAGE_REGISTRY for your page name/path
 *    - Avoid duplicate IDs and paths
 * 
 * 2. ✅ Identify the correct module
 *    - system: User management, settings, audit logs, system configuration
 *    - finance: Financial operations, accounting, treasury, budgeting
 *    - procurement: Purchase orders, vendor management, procurement processes
 *    - operations: Warehouse, logistics, inventory, delivery operations
 *    - compliance: Legal, regulatory compliance, audits, policy management
 * 
 * 3. ✅ Define required permissions
 *    - What actions does a user need to access this page?
 *    - Examples: 'system-settings', 'financial-reporting', 'purchase-order-create'
 *    - Users need AT LEAST ONE of the listed permissions (OR logic)
 * 
 * 4. ✅ Assign target roles
 *    - Which roles should see this page in their sidebar?
 *    - Examples: ['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER']
 *    - Multiple roles can access the same page
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔨 ADDING A NEW PAGE - STEP BY STEP
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Step 1: Create the page file
 * ────────────────────────────────────────────────────────────────────────────
 * Create: src/app/[module]/[page-name]/page.tsx
 * 
 * Example:
 *   src/app/finance/budget-approval/page.tsx
 * 
 * Template:
 *   ```typescript
 *   import SuperAdminShell from '@/components/layouts/SuperAdminShell';
 *   
 *   export default function BudgetApprovalPage() {
 *     return (
 *       <SuperAdminShell title="Budget Approval" module="finance">
 *         <div className="p-6">
 *           <h1>Budget Approval</h1>
 *           {/* Your page content here *\/}
 *         </div>
 *       </SuperAdminShell>
 *     );
 *   }
 *   ```
 * 
 * Step 2: Add entry to PAGE_REGISTRY
 * ────────────────────────────────────────────────────────────────────────────
 * Scroll down to the PAGE_REGISTRY array and add your page entry.
 * Copy an existing entry and modify it.
 * 
 * Example:
 *   ```typescript
 *   {
 *     id: 'budget-approval',                    // Unique kebab-case ID
 *     name: 'Budget Approval',                  // Display name in sidebar
 *     path: '/finance/budget-approval',         // Route path (must match folder)
 *     icon: CheckCircle,                        // Icon from lucide-react
 *     module: 'finance',                        // Module category
 *     permissions: ['budget-approve'],          // Required permissions (OR)
 *     roles: ['CFO', 'FINANCE_CONTROLLER'],     // Target roles
 *     status: 'active',                         // active | coming-soon | disabled
 *     description: 'Approve and review budget requests',
 *     order: 10,                                // Display order in sidebar
 *   },
 *   ```
 * 
 * Step 3: Run consistency check
 * ────────────────────────────────────────────────────────────────────────────
  module: 'pump-management',
 *   cd my-backend
 *   node check-modules-consistency.js
 *   ```
 * 
 * This will verify:
 *   ✅ Page file exists
 *   ✅ Page is registered here
 *   ✅ Backend route exists (if needed)
 *   ✅ No dead links
 *   ✅ No orphan pages
 * 
 * Step 4: Test with demo user
 * ────────────────────────────────────────────────────────────────────────────
 *   Login credentials: demo_[role]@bisman.demo / Demo@123
 *   
 *   Examples:
 *   - business_superadmin@bisman.demo
 *   - pump_superadmin@bisman.demo
 *   - demo_cfo@bisman.demo
 *   - demo_finance_controller@bisman.demo
 * 
 *   1. Login with a user that has the target role
 *   2. Check sidebar - your page should appear
 *   3. Click the page link - it should load without errors
 *   4. Verify permissions work correctly
 * 
 * Step 5: Commit both files
 * ────────────────────────────────────────────────────────────────────────────
 *   ```bash
 *   git add src/app/[module]/[page-name]/page.tsx
 *   git add src/common/config/page-registry.ts
 *   git commit -m "feat: add [page-name] page to [module] module"
 *   ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✅ VERIFICATION CHECKLIST
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Before committing, ensure:
 * 
 * □ Page file created in correct directory structure
 * □ PAGE_REGISTRY entry added with all required fields
 * □ Unique ID (no duplicates)
 * □ Correct module assignment
 * □ Appropriate permissions defined
 * □ Target roles assigned
 * □ Icon imported from lucide-react
 * □ Consistency check passes
 * □ Page appears in sidebar for target roles
 * □ Page loads without errors
 * □ No TypeScript errors
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚫 DON'T DO THIS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ❌ Don't create pages without updating this registry
 *    → Pages won't appear in sidebar navigation
 * 
 * ❌ Don't duplicate page IDs
 *    → Causes routing conflicts and sidebar errors
 * 
 * ❌ Don't change existing page paths without migration plan
 *    → Breaks user bookmarks and external links
 * 
 * ❌ Don't delete pages from registry
 *    → Set status: 'disabled' instead for backward compatibility
 * 
 * ❌ Don't assign empty roles array
 *    → Page becomes orphan and unreachable
 * 
 * ❌ Don't forget to run consistency check
 *    → Undetected issues may break production
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🛠️ MAINTENANCE COMMANDS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Check consistency:
 *   cd my-backend && node check-modules-consistency.js
 * 
 * Export to JSON (for AI tools):
 *   cd my-backend && node scripts/export-page-registry.js
 * 
 * Create missing pages:
 *   cd my-backend && node create-missing-pages.js --module [name]
 *   cd my-backend && node create-missing-pages.js --all
 * 
 * View all demo users:
 *   cd my-backend && node scripts/list-users.js
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 CURRENT STATISTICS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Total Pages: 84
 * Total Modules: 5
 * 
 * Pages by Module:
 *   - system: 16 pages
 *   - finance: 32 pages
 *   - operations: 15 pages
 *   - procurement: 6 pages
 *   - compliance: 10 pages
 *   - role dashboards: 6 pages
 * 
 * Last Updated: October 22, 2025
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// NOTE: Avoid importing `lucide-react` at module scope to prevent SSR/runtime
// issues during Next.js prerender. We declare a lightweight placeholder type
// and stub icon variables so the registry can be imported safely at build-time.
type LucideIcon = any;

// Stub icon variables (placeholders) — actual icon components are resolved at
// runtime in client components (DynamicSidebar / TopNav etc.) to avoid
// executing lucide-react during server prerender.
// Provide stable noop React components instead of undefined to avoid
// "Element type is invalid" during prerender when legacy `icon` fields
// are still referenced somewhere. Each returns null.
const Shield: LucideIcon = (() => null) as any;
const Users: LucideIcon = (() => null) as any;
const Database: LucideIcon = (() => null) as any;
const Activity: LucideIcon = (() => null) as any;
const Settings: LucideIcon = (() => null) as any;
const Key: LucideIcon = (() => null) as any;
const Server: LucideIcon = (() => null) as any;
const User: LucideIcon = (() => null) as any;
const UserPlus: LucideIcon = (() => null) as any;
const DollarSign: LucideIcon = (() => null) as any;
const FileText: LucideIcon = (() => null) as any;
const TrendingUp: LucideIcon = (() => null) as any;
const BarChart3: LucideIcon = (() => null) as any;
const PieChart: LucideIcon = (() => null) as any;
const Briefcase: LucideIcon = (() => null) as any;
const ShoppingCart: LucideIcon = (() => null) as any;
const Package: LucideIcon = (() => null) as any;
const Truck: LucideIcon = (() => null) as any;
const ClipboardCheck: LucideIcon = (() => null) as any;
const FileCheck: LucideIcon = (() => null) as any;
const Scale: LucideIcon = (() => null) as any;
const AlertTriangle: LucideIcon = (() => null) as any;
const BookOpen: LucideIcon = (() => null) as any;
const Archive: LucideIcon = (() => null) as any;
const CreditCard: LucideIcon = (() => null) as any;
const Wallet: LucideIcon = (() => null) as any;
const Building: LucideIcon = (() => null) as any;
const Calculator: LucideIcon = (() => null) as any;
const Receipt: LucideIcon = (() => null) as any;
const Banknote: LucideIcon = (() => null) as any;
const FileSpreadsheet: LucideIcon = (() => null) as any;
const Landmark: LucideIcon = (() => null) as any;
const Globe: LucideIcon = (() => null) as any;
const Coins: LucideIcon = (() => null) as any;
const FolderOpen: LucideIcon = (() => null) as any;
const FileEdit: LucideIcon = (() => null) as any;
const Upload: LucideIcon = (() => null) as any;
const CheckCircle: LucideIcon = (() => null) as any;
const Clock: LucideIcon = (() => null) as any;
const Calendar: LucideIcon = (() => null) as any;
const Box: LucideIcon = (() => null) as any;
const Boxes: LucideIcon = (() => null) as any;
const ListChecks: LucideIcon = (() => null) as any;
const Tag: LucideIcon = (() => null) as any;
const Factory: LucideIcon = (() => null) as any;
const Route: LucideIcon = (() => null) as any;
const MapPin: LucideIcon = (() => null) as any;
const Clipboard: LucideIcon = (() => null) as any;
const FileSignature: LucideIcon = (() => null) as any;
const Gavel: LucideIcon = (() => null) as any;
const Folder: LucideIcon = (() => null) as any;
const UserCheck: LucideIcon = (() => null) as any;
const Bell: LucideIcon = (() => null) as any;
const HelpCircle: LucideIcon = (() => null) as any;

// Page status types
export type PageStatus = 'active' | 'coming-soon' | 'disabled';

// Page metadata interface
export interface PageMetadata {
  id: string;
  name: string;
  path: string;
  // iconKey is a lucide-react component name string (e.g. "Settings", "Users")
  // resolved client-side; avoids importing lucide components during SSR.
  iconKey?: string;
  module: 'system' | 'finance' | 'procurement' | 'operations' | 'compliance' | 'common' | 'pump-management' | 'hr';
  permissions: string[]; // Required permissions (OR logic)
  roles: string[]; // Recommended roles
  status: PageStatus;
  description?: string;
  badge?: string; // Optional badge text (e.g., "New", "Beta")
  order?: number; // Display order within module
}

// Module metadata
export interface ModuleMetadata {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  color: string; // Tailwind color class
  order: number;
}

/**
 * Module Definitions
 */
export const MODULES: Record<string, ModuleMetadata> = {
  system: {
    id: 'system',
    name: 'System Administration',
    icon: Shield,
    description: 'System management and configuration',
    color: 'blue',
    order: 1,
  },
  finance: {
    id: 'finance',
    name: 'Finance & Accounting',
    icon: DollarSign,
    description: 'Financial management and reporting',
    color: 'green',
    order: 2,
  },
  procurement: {
    id: 'procurement',
    name: 'Procurement',
    icon: ShoppingCart,
    description: 'Purchase and supplier management',
    color: 'purple',
    order: 3,
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    icon: Package,
    description: 'Operational workflows and inventory',
    color: 'orange',
    order: 4,
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance & Legal',
    icon: Scale,
    description: 'Compliance and legal management',
    color: 'red',
    order: 5,
  },
  'pump-management': {
    id: 'pump-management',
    name: 'Pump Management',
    icon: Factory,
    description: 'Pump operations, diagnostics, and common tools',
    color: 'amber',
    order: 6,
  },
  hr: {
    id: 'hr',
    name: 'Human Resources',
    icon: Users,
    description: 'HR management and employee operations',
    color: 'teal',
    order: 7,
  },
  common: {
    id: 'common',
    name: 'Common',
    icon: User,
    description: 'Pages available to all users',
    color: 'gray',
    order: 999, // Show at bottom of sidebar
  },
};

/**
 * Complete Page Registry
 * All 73 pages (6 existing + 67 newly created)
 */
export const PAGE_REGISTRY: PageMetadata[] = [
  // ==================== SYSTEM MODULE (13 pages) ====================
  {
    id: 'system-settings',
    name: 'System Settings',
    path: '/system/system-settings',
    iconKey: "Settings",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'ADMIN', 'SYSTEM ADMINISTRATOR', 'IT ADMIN'],
    status: 'active',
    description: 'Configure system-wide settings',
    order: 1,
  },
  {
    id: 'user-management',
    name: 'Client Management',
    path: '/system/user-management',
    iconKey: "Users",
    module: 'system',
    permissions: ['user-management'],
  roles: ['SYSTEM_ADMIN', 'ADMIN', 'SYSTEM ADMINISTRATOR'],
    status: 'active',
  description: 'Manage ERP clients and quick-access their Admin login',
    order: 2,
  },
  {
    id: 'user-creation',
    name: 'Create New User',
    path: '/hr/user-creation',
    iconKey: "UserPlus",
    module: 'hr',
    permissions: ['user-management', 'hr-management'],
  roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'],
    status: 'active',
    description: 'Two-stage user creation with KYC workflow - HR creates request and sends KYC link or creates user immediately',
    badge: 'New',
    order: 2.5,
  },
  {
    id: 'permission-manager',
    name: 'Permission Manager',
    path: '/system/permission-manager',
  iconKey: "Key",
    module: 'system',
    permissions: ['user-management'],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'Manage system permissions',
    order: 3,
  },
  {
    id: 'roles-users-report',
    name: 'Modules & Roles',
    path: '/system/roles-users-report',
  iconKey: "FileText",
    module: 'system',
    permissions: ['user-management'],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'View comprehensive report of all roles and assigned users',
    order: 4,
  },
  {
    id: 'pages-roles-report',
    name: 'Pages & Roles Report',
    path: '/system/pages-roles-report',
  iconKey: "FileText",
    module: 'system',
    permissions: ['user-management', 'system-settings'],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'View all pages and their assigned roles, identify orphan pages',
    order: 5,
  },
  {
    id: 'role-access-explorer',
    name: 'Role & Access Explorer',
    path: '/system/role-access-explorer',
  iconKey: "FileText",
    module: 'system',
    permissions: ['user-management', 'system-settings'],
    roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'Interactive matrix and visual explorer for roles, workflows, and test scenarios',
    order: 5.5,
  },
  // ==================== COMPLIANCE & LEGAL (Agreements) ====================
  {
    id: 'legal-agreements',
    name: 'Agreements & Contracts',
    path: '/compliance/agreements',
  iconKey: "FileSignature",
    module: 'compliance',
    permissions: ['contract-view'],
    roles: ['LEGAL', 'COMPLIANCE', 'ADMIN', 'SYSTEM_ADMIN'],
    status: 'active',
    description: 'View-only list of legal agreements and contracts with computed totals',
    order: 20,
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    path: '/system/audit-logs',
  iconKey: "Activity",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'ADMIN', 'SYSTEM ADMINISTRATOR', 'IT ADMIN'],
    status: 'active',
    description: 'View system activity and audit trails',
    order: 5,
  },
  {
    id: 'backup-restore',
    name: 'Backup & Restore',
    path: '/system/backup-restore',
  iconKey: "Database",
    module: 'system',
    // Allow via either system settings or pump management common permissions
    permissions: [
      'system-settings',
      'pump-management:common',
      'pump:common',
      'pump-management-common',
      'pump-management'
    ],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'Manage system backups and restoration',
    order: 6,
  },
  {
    id: 'scheduler',
    name: 'Task Scheduler',
    path: '/system/scheduler',
  iconKey: "Clock",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'Configure automated tasks and schedules',
    order: 7,
  },
  {
    id: 'system-health',
    name: 'System Health',
    path: '/system/system-health-dashboard',
  iconKey: "Activity",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'ADMIN', 'SYSTEM ADMINISTRATOR', 'IT ADMIN'],
    status: 'active',
    description: 'Monitor system performance and health',
    order: 8,
  },
  {
    id: 'integration-settings',
    name: 'Integration Settings',
    path: '/system/integration-settings',
  iconKey: "Route",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'Configure third-party integrations',
    order: 9,
  },
  {
    id: 'error-logs',
    name: 'Error Logs',
    path: '/system/error-logs',
  iconKey: "AlertTriangle",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'ADMIN', 'SYSTEM ADMINISTRATOR', 'IT ADMIN'],
    status: 'active',
    description: 'View and manage system error logs',
    order: 10,
  },
  {
    id: 'server-logs',
    name: 'Server Logs',
    path: '/system/server-logs',
  iconKey: "Server",
    module: 'system',
    // Allow via System Settings
    permissions: [
      'system-settings',
      'pump:common',
      'pump-management-common',
      'pump-management'
    ],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'Access server logs and diagnostics',
    order: 1,
  },
  {
    id: 'deployment-tools',
    name: 'Deployment Tools',
    path: '/system/deployment-tools',
  iconKey: "Upload",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'ADMIN'],
    status: 'active',
    description: 'Manage deployments and releases',
    order: 12,
  },
  {
    id: 'api-config',
    name: 'API Configuration',
    path: '/system/api-integration-config',
  iconKey: "Route",
    module: 'system',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN', 'SYSTEM ADMINISTRATOR'],
    status: 'active',
    description: 'Configure API integrations',
    order: 13,
  },
  {
    id: 'company-setup',
    name: 'Company Setup',
    path: '/system/company-setup',
  iconKey: "Building",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'ADMIN'],
    status: 'active',
    description: 'Configure company information',
    order: 14,
  },
  {
    id: 'master-data',
    name: 'Master Data',
    path: '/system/master-data-management',
  iconKey: "Database",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SYSTEM_ADMIN', 'ADMIN'],
    status: 'active',
    description: 'Manage master data entities',
    order: 15,
  },

  // ==================== FINANCE MODULE (30 pages) ====================
  {
    id: 'executive-dashboard',
    name: 'Executive Dashboard',
    path: '/finance/executive-dashboard',
  iconKey: "BarChart3",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER', 'TREASURY'],
    status: 'active',
    description: 'Executive financial overview',
    order: 1,
  },
  {
    id: 'financial-statements',
    name: 'Financial Statements',
    path: '/finance/financial-statements',
  iconKey: "FileText",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'View comprehensive financial statements',
    order: 2,
  },
  {
    id: 'general-ledger',
    name: 'General Ledger',
    path: '/finance/general-ledger',
  iconKey: "BookOpen",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER', 'ACCOUNTS'],
    status: 'active',
    description: 'Manage general ledger entries',
    order: 3,
  },
  {
    id: 'budgeting-forecasting',
    name: 'Budgeting & Forecasting',
    path: '/finance/budgeting-forecasting',
  iconKey: "TrendingUp",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Create and manage budgets',
    order: 4,
  },
  {
    id: 'cash-flow-statement',
    name: 'Cash Flow Statement',
    path: '/finance/cash-flow-statement',
  iconKey: "DollarSign",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'TREASURY'],
    status: 'active',
    description: 'View cash flow reports',
    order: 5,
  },
  {
    id: 'company-dashboard',
    name: 'Company Dashboard',
    path: '/finance/company-dashboard',
  iconKey: "Building",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO'],
    status: 'active',
    description: 'Executive company overview',
    order: 6,
  },
  {
    id: 'period-end-closing',
    name: 'Period End Closing',
    path: '/finance/period-end-closing',
  iconKey: "Archive",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER', 'ACCOUNTS'],
    status: 'active',
    description: 'Manage period closing process',
    order: 7,
  },
  {
    id: 'cost-center-analysis',
    name: 'Cost Center Analysis',
    path: '/finance/cost-center-analysis',
  iconKey: "PieChart",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Analyze cost centers',
    order: 8,
  },
  {
    id: 'journal-entries-approval',
    name: 'Journal Entry Approval',
    path: '/finance/journal-entries-approval',
  iconKey: "CheckCircle",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Approve journal entries',
    order: 9,
  },
  {
    id: 'trial-balance',
    name: 'Trial Balance',
    path: '/finance/trial-balance',
  iconKey: "FileSpreadsheet",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER', 'ACCOUNTS'],
    status: 'active',
    description: 'View trial balance reports',
    order: 10,
  },
  {
    id: 'journal-entries',
    name: 'Journal Entries',
    path: '/finance/journal-entries',
  iconKey: "FileEdit",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Manage journal entries',
    order: 11,
  },
  {
    id: 'inter-company-reconciliation',
    name: 'Inter-Company Reconciliation',
    path: '/finance/inter-company-reconciliation',
  iconKey: "Globe",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Reconcile inter-company transactions',
    order: 12,
  },
  {
    id: 'fixed-asset-register',
    name: 'Fixed Asset Register',
    path: '/finance/fixed-asset-register',
  iconKey: "Briefcase",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Manage fixed assets',
    order: 13,
  },
  {
    id: 'tax-reports',
    name: 'Tax Reports',
    path: '/finance/tax-reports',
  iconKey: "Receipt",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER', 'ACCOUNTS'],
    status: 'active',
    description: 'Generate tax reports',
    order: 14,
  },
  {
    id: 'bank-reconciliation',
    name: 'Bank Reconciliation',
    path: '/finance/bank-reconciliation',
  iconKey: "Landmark",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['BANKER', 'ACCOUNTS', 'TREASURY'],
    status: 'active',
    description: 'Reconcile bank statements',
    order: 15,
  },
  {
    id: 'cash-flow-forecast',
    name: 'Cash Flow Forecast',
    path: '/finance/cash-flow-forecast',
  iconKey: "TrendingUp",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'TREASURY'],
    status: 'active',
    description: 'Forecast cash flow',
    order: 16,
  },
  {
    id: 'payment-gateway',
    name: 'Payment Gateway',
    path: '/finance/payment-gateway-integration',
  iconKey: "CreditCard",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['TREASURY', 'BANKER'],
    status: 'active',
    description: 'Manage payment integrations',
    order: 17,
  },
  {
    id: 'foreign-exchange',
    name: 'Foreign Exchange',
    path: '/finance/foreign-exchange-management',
  iconKey: "Globe",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'TREASURY', 'BANKER'],
    status: 'active',
    description: 'Manage FX transactions',
    order: 18,
  },
  {
    id: 'loan-management',
    name: 'Loan Management',
    path: '/finance/loan-management',
  iconKey: "Coins",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'TREASURY'],
    status: 'active',
    description: 'Track loans and financing',
    order: 19,
  },
  {
    id: 'chart-of-accounts',
    name: 'Chart of Accounts',
    path: '/finance/chart-of-accounts',
  iconKey: "FolderOpen",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE CONTROLLER', 'ACCOUNTS'],
    status: 'active',
    description: 'Manage account structure',
    order: 20,
  },
  {
    id: 'invoice-posting',
    name: 'Invoice Posting',
    path: '/finance/invoice-posting',
  iconKey: "FileText",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS', 'ACCOUNTS PAYABLE'],
    status: 'active',
    description: 'Post and manage invoices',
    order: 21,
  },
  {
    id: 'period-adjustments',
    name: 'Period Adjustments',
    path: '/finance/period-end-adjustment-entries',
  iconKey: "FileEdit",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['FINANCE CONTROLLER', 'ACCOUNTS'],
    status: 'active',
    description: 'Manage period adjustments',
    order: 22,
  },
  {
    id: 'purchase-invoice',
    name: 'Purchase Invoice',
    path: '/finance/purchase-invoice',
  iconKey: "Receipt",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS PAYABLE', 'ACCOUNTS'],
    status: 'active',
    description: 'Process purchase invoices',
    order: 23,
  },
  {
    id: 'payment-entry',
    name: 'Payment Entry',
    path: '/finance/payment-entry',
  iconKey: "Banknote",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS PAYABLE', 'TREASURY', 'BANKER'],
    status: 'active',
    description: 'Record payment transactions',
    order: 24,
  },
  {
    id: 'vendor-master',
    name: 'Vendor Master',
    path: '/finance/vendor-master',
  iconKey: "Users",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS PAYABLE', 'PROCUREMENT OFFICER'],
    status: 'active',
    description: 'Manage vendor information',
    order: 25,
  },
  {
    id: 'expense-report',
    name: 'Expense Report',
    path: '/finance/expense-report',
  iconKey: "Calculator",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Submit and track expenses',
    order: 26,
  },
  {
    id: 'payment-batch',
    name: 'Batch Processing',
    path: '/finance/payment-batch-processing',
  iconKey: "Boxes",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['TREASURY', 'BANKER', 'ACCOUNTS PAYABLE'],
    status: 'active',
    description: 'Process payment batches',
    order: 27,
  },
  {
    id: 'payment-view',
    name: 'Payment View',
    path: '/finance/payment-entry-view',
  iconKey: "FileText",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS', 'TREASURY'],
    status: 'active',
    description: 'View payment entries',
    order: 28,
  },
  {
    id: 'bank-upload',
    name: 'Bank Statement Upload',
    path: '/finance/bank-statement-upload',
  iconKey: "Upload",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['BANKER', 'ACCOUNTS'],
    status: 'active',
    description: 'Upload bank statements',
    order: 29,
  },
  {
    id: 'bank-reconcile-exec',
    name: 'Execute Reconciliation',
    path: '/finance/bank-reconciliation-execute',
  iconKey: "CheckCircle",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['BANKER', 'ACCOUNTS'],
    status: 'active',
    description: 'Execute bank reconciliation',
    order: 30,
  },
  {
    id: 'payment-approval',
    name: 'Payment Approval',
    path: '/finance/payment-approval-queue',
  iconKey: "CheckCircle",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'TREASURY', 'FINANCE CONTROLLER'],
    status: 'active',
    description: 'Approve pending payments',
    order: 31,
  },

  // ==================== PROCUREMENT MODULE (4 pages) ====================
  {
    id: 'purchase-order',
    name: 'Purchase Order',
    path: '/procurement/purchase-order',
  iconKey: "ShoppingCart",
    module: 'procurement',
    permissions: ['purchase-order'],
    roles: ['PROCUREMENT OFFICER'],
    status: 'active',
    description: 'Manage purchase orders',
    order: 1,
  },
  {
    id: 'purchase-request',
    name: 'Purchase Request',
    path: '/procurement/purchase-request',
  iconKey: "FileText",
    module: 'procurement',
    permissions: ['purchase-order'],
    roles: ['PROCUREMENT OFFICER', 'STORE INCHARGE'],
    status: 'active',
    description: 'Create and manage purchase requests',
    order: 2,
  },
  {
    id: 'supplier-quotation',
    name: 'Supplier Quotation',
    path: '/procurement/supplier-quotation',
  iconKey: "FileText",
    module: 'procurement',
    permissions: ['purchase-order'],
    roles: ['PROCUREMENT OFFICER'],
    status: 'active',
    description: 'Manage supplier quotations',
    order: 3,
  },
  {
    id: 'supplier-master',
    name: 'Supplier Master',
    path: '/procurement/supplier-master',
  iconKey: "Users",
    module: 'procurement',
    permissions: ['purchase-order'],
    roles: ['PROCUREMENT OFFICER'],
    status: 'active',
    description: 'Manage supplier database',
    order: 4,
  },
  {
    id: 'material-request',
    name: 'Material Request',
    path: '/procurement/material-request',
  iconKey: "Package",
    module: 'procurement',
    permissions: ['purchase-order'],
    roles: ['PROCUREMENT OFFICER', 'STORE INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Create material requests',
    order: 5,
  },

  // ==================== OPERATIONS MODULE (12 pages) ====================
  {
    id: 'kpi-dashboard',
    name: 'KPI Dashboard',
    path: '/operations/kpi-dashboard',
  iconKey: "BarChart3",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['OPERATIONS MANAGER', 'HUB INCHARGE'],
    status: 'active',
    description: 'Operations KPI overview',
    order: 1,
  },
  {
    id: 'stock-entry',
    name: 'Stock Entry',
    path: '/operations/stock-entry',
  iconKey: "Package",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['STORE INCHARGE', 'HUB INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Record stock movements',
    order: 2,
  },
  {
    id: 'item-master',
    name: 'Item Master',
    path: '/operations/item-master-limited',
  iconKey: "Tag",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['STORE INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Manage item catalog',
    order: 3,
  },
  {
    id: 'stock-ledger',
    name: 'Stock Ledger',
    path: '/operations/stock-ledger',
  iconKey: "BookOpen",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['STORE INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'View stock ledger',
    order: 4,
  },
  {
    id: 'delivery-note',
    name: 'Delivery Note',
    path: '/operations/delivery-note',
  iconKey: "Truck",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['HUB INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Manage delivery notes',
    order: 5,
  },
  {
    id: 'quality-inspection',
    name: 'Quality Inspection',
    path: '/operations/quality-inspection',
  iconKey: "ClipboardCheck",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['STORE INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Perform quality checks',
    order: 6,
  },
  {
    id: 'sales-order',
    name: 'Sales Order',
    path: '/operations/sales-order',
  iconKey: "ShoppingCart",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['HUB INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Manage sales orders',
    order: 7,
  },
  {
    id: 'work-order',
    name: 'Work Order',
    path: '/operations/work-order',
  iconKey: "Factory",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['OPERATIONS MANAGER', 'HUB INCHARGE'],
    status: 'active',
    description: 'Create and track work orders',
    order: 8,
  },
  {
    id: 'bom-view',
    name: 'Bill of Materials',
    path: '/operations/bom-view',
  iconKey: "ListChecks",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['OPERATIONS MANAGER', 'STORE INCHARGE'],
    status: 'active',
    description: 'View BOM structure',
    order: 9,
  },
  {
    id: 'shipping-logistics',
    name: 'Shipping & Logistics',
    path: '/operations/shipping-logistics',
  iconKey: "Truck",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['HUB INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Manage shipping operations',
    order: 10,
  },
  {
    id: 'stock-transfer',
    name: 'Stock Transfer',
    path: '/operations/stock-entry-transfer',
  iconKey: "MapPin",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['STORE INCHARGE', 'HUB INCHARGE'],
    status: 'active',
    description: 'Transfer stock between locations',
    order: 11,
  },
  {
    id: 'sales-order-view',
    name: 'Sales Order View',
    path: '/operations/sales-order-view',
  iconKey: "FileText",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['HUB INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'View sales orders',
    order: 12,
  },
  {
    id: 'asset-register',
    name: 'Asset Register',
    path: '/operations/asset-register-hub',
  iconKey: "Box",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['HUB INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Manage hub assets',
    order: 13,
  },

  // ==================== COMPLIANCE MODULE (8 pages) ====================
  {
    id: 'compliance-dashboard',
    name: 'Compliance Dashboard',
    path: '/compliance/compliance-dashboard',
  iconKey: "Scale",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['COMPLIANCE', 'LEGAL'],
    status: 'active',
    description: 'Compliance overview',
    order: 1,
  },
  {
    id: 'audit-trail',
    name: 'Audit Trail',
    path: '/compliance/audit-trail',
  iconKey: "Activity",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['COMPLIANCE', 'LEGAL'],
    status: 'active',
    description: 'View complete audit trail',
    order: 2,
  },
  {
    id: 'policy-management',
    name: 'Policy Management',
    path: '/compliance/policy-management',
  iconKey: "FileCheck",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['COMPLIANCE', 'LEGAL'],
    status: 'active',
    description: 'Manage compliance policies',
    order: 3,
  },
  {
    id: 'regulatory-templates',
    name: 'Report Templates',
    path: '/compliance/regulatory-report-templates',
  iconKey: "FileText",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['COMPLIANCE', 'LEGAL'],
    status: 'active',
    description: 'Manage regulatory templates',
    order: 4,
  },
  {
    id: 'approval-workflows',
    name: 'Approval Workflows',
    path: '/compliance/approval-workflow-view',
  iconKey: "CheckCircle",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['COMPLIANCE'],
    status: 'active',
    description: 'View approval processes',
    order: 5,
  },
  {
    id: 'contract-management',
    name: 'Contract Management',
    path: '/compliance/contract-management',
  iconKey: "FileSignature",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['LEGAL', 'COMPLIANCE'],
    status: 'active',
    description: 'Manage contracts',
    order: 6,
  },
  {
    id: 'litigation-tracker',
    name: 'Litigation Tracker',
    path: '/compliance/litigation-tracker',
  iconKey: "Gavel",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['LEGAL'],
    status: 'active',
    description: 'Track legal cases',
    order: 7,
  },
  {
    id: 'document-repository',
    name: 'Document Repository',
    path: '/compliance/document-repository-view',
  iconKey: "Folder",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['COMPLIANCE', 'LEGAL'],
    status: 'active',
    description: 'Access document library',
    order: 8,
  },
  {
    id: 'legal-master',
    name: 'Legal Master Data',
    path: '/compliance/vendor-customer-master-legal',
  iconKey: "UserCheck",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['LEGAL', 'COMPLIANCE'],
    status: 'active',
    description: 'Manage legal entity data',
    order: 9,
  },

  // ==================== ROLE-BASED DASHBOARDS (6 pages) ====================
  {
    id: 'hub-incharge-dashboard',
    name: 'Hub Incharge Dashboard',
    path: '/hub-incharge',
  iconKey: "MapPin",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['HUB INCHARGE'],
    status: 'active',
    description: 'Hub operations management dashboard',
    order: 100,
  },
  {
    id: 'store-incharge-dashboard',
    name: 'Store Incharge Dashboard',
    path: '/store-incharge',
  iconKey: "Package",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['STORE INCHARGE'],
    status: 'active',
    description: 'Store operations management dashboard',
    order: 101,
  },
  {
    id: 'operations-manager-dashboard',
    name: 'Operations Manager Dashboard',
    path: '/operations-manager',
  iconKey: "Briefcase",
    module: 'operations',
    permissions: ['kpi-dashboard'],
    roles: ['OPERATIONS MANAGER'],
    status: 'active',
    description: 'Operations oversight and management',
    order: 102,
  },
  {
    id: 'procurement-officer-dashboard',
    name: 'Procurement Officer Dashboard',
    path: '/procurement-officer',
  iconKey: "ShoppingCart",
    module: 'procurement',
    permissions: ['purchase-order'],
    roles: ['PROCUREMENT OFFICER'],
    status: 'active',
    description: 'Procurement management dashboard',
    order: 100,
  },
  {
    id: 'finance-controller-dashboard',
    name: 'Finance Controller Dashboard',
    path: '/finance-controller',
  iconKey: "Calculator",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['FINANCE CONTROLLER'],
    status: 'active',
    description: 'Financial control and oversight',
    order: 100,
  },
  {
    id: 'compliance-officer-dashboard',
    name: 'Compliance Officer Dashboard',
    path: '/compliance-officer',
  iconKey: "Shield",
    module: 'compliance',
    permissions: ['compliance-dashboard'],
    roles: ['COMPLIANCE'],
    status: 'active',
    description: 'Compliance monitoring and management',
    order: 100,
  },

  // ==================== COMMON MODULE (9 pages) ====================
  // These pages are accessible to ALL authenticated users regardless of role
  // Create User removed per request
  // Change Password removed per request
  // Notifications page removed per request
  {
    id: 'common-messages',
    name: 'Messages',
    path: '/common/messages',
  iconKey: "HelpCircle",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL'],
  status: 'disabled',
    description: 'Internal messaging system',
    order: 5,
  },
  // Help Center removed per request
  // {
  //   id: 'common-help-center',
  //   name: 'Help Center',
  //   path: '/common/help-center',
  //   icon: HelpCircle,
  //   module: 'common',
  //   permissions: ['authenticated'],
  //   roles: ['ALL'],
  //   status: 'active',
  //   description: 'Get help and support resources',
  //   order: 6,
  // },
  // Documentation removed per request
  // {
  //   id: 'common-documentation',
  //   name: 'Documentation',
  //   path: '/common/documentation',
  //   icon: FileText,
  //   module: 'common',
  //   permissions: ['authenticated'],
  //   roles: ['ALL'],
  //   status: 'active',
  //   description: 'System documentation and guides',
  //   order: 7,
  // },
  {
    id: 'common-user-settings',
    name: 'User Settings',
    path: '/common/user-settings',
  iconKey: "Settings",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL'],
    status: 'active',
    description: 'Customize your preferences and settings',
    order: 8,
  },
  {
    id: 'common-payment-request',
    name: 'Payment Request',
    path: '/common/payment-request',
  iconKey: "DollarSign",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL'],
    status: 'active',
    description: 'Submit and track payment requests',
    order: 9,
  },
  // Task Approvals removed per request
  // Calendar removed from sidebar per request
];

/**
 * Get pages for a specific module
 */
export function getPagesByModule(moduleId: string): PageMetadata[] {
  return PAGE_REGISTRY
    .filter(page => page.module === moduleId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Get pages accessible by a user's permissions
 */
export function getAccessiblePages(userPermissions: string[]): PageMetadata[] {
  return PAGE_REGISTRY.filter(page =>
    page.permissions.some(perm => userPermissions.includes(perm))
  );
}

/**
 * Get pages by role
 */
export function getPagesByRole(roleName: string): PageMetadata[] {
  const normalizedRole = roleName.toUpperCase();
  return PAGE_REGISTRY.filter(page =>
    page.roles.some(role => role.toUpperCase() === normalizedRole)
  );
}

/**
 * Check if a page exists (for route validation)
 */
export function pageExists(pageId: string): boolean {
  return PAGE_REGISTRY.some(page => page.id === pageId);
}

/**
 * Get page by path
 */
export function getPageByPath(path: string): PageMetadata | undefined {
  return PAGE_REGISTRY.find(page => page.path === path);
}

/**
 * Get navigation structure grouped by module
 */
export function getNavigationStructure(userPermissions: string[]): Record<string, PageMetadata[]> {
  const accessiblePages = getAccessiblePages(userPermissions);
  const grouped: Record<string, PageMetadata[]> = {};

  Object.keys(MODULES).forEach(moduleId => {
    grouped[moduleId] = accessiblePages
      .filter(page => page.module === moduleId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  return grouped;
}
