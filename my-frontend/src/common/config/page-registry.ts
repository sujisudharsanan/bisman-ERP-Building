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
  module: 'system' | 'finance' | 'procurement' | 'operations' | 'compliance' | 'common' | 'pump-management' | 'hr' | 'super-admin' | 'enterprise-admin' | 'admin' | 'billing' | 'qa' | 'governance' | 'internal' | 'subscriptions';
  permissions: string[]; // Required permissions (OR logic)
  roles: string[]; // Recommended roles
  status: PageStatus;
  showInSidebar?: boolean; // Optional - hide from sidebar while keeping page accessible
  description?: string;
  badge?: string; // Optional badge text (e.g., "New", "Beta")
  order?: number; // Display order within module
  
  // Governance tracking fields (optional)
  reviewed_by?: string; // Email or name of reviewer who validated this page
  reviewed_at?: string; // ISO date string when page was reviewed
  owner?: string; // Page owner/maintainer (email or name)
}

// Module metadata
export interface ModuleMetadata {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  color: string; // Tailwind color class
  order: number;
  hidden?: boolean; // Hide module from sidebar navigation
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
  billing: {
    id: 'billing',
    name: 'Billing & Subscription',
    icon: CreditCard,
    description: 'Subscription management, invoices, and usage',
    color: 'indigo',
    order: 8,
  },
  admin: {
    id: 'admin',
    name: 'Admin Console',
    icon: Shield,
    description: 'Platform administration and monitoring',
    color: 'slate',
    order: 9,
  },
  qa: {
    id: 'qa',
    name: 'QA & Testing',
    icon: ClipboardCheck,
    description: 'Quality assurance, bug tracking, and test management (Internal use only)',
    color: 'cyan',
    order: 10,
    hidden: true, // Hidden from all users - internal testing module only
  },
  governance: {
    id: 'governance',
    name: 'Governance',
    icon: Shield,
    description: 'Security monitoring, RBAC structure, and audit integrity',
    color: 'purple',
    order: 0, // Show at top for Enterprise/Super Admins
  },
  internal: {
    id: 'internal',
    name: 'Internal Operations',
    icon: Shield,
    description: 'BISMAN internal team management, support sessions, and customer assistance',
    color: 'rose',
    order: -1, // Show at very top for internal staff
    hidden: true, // Hidden from regular users - internal BISMAN staff only
  },
  'super-admin': {
    id: 'super-admin',
    name: 'Super Admin',
    icon: Shield,
    description: 'Super Admin management, client oversight and system tools',
    color: 'indigo',
    order: -2, // Show near top for Super Admins
  },
  'enterprise-admin': {
    id: 'enterprise-admin',
    name: 'Enterprise Admin',
    icon: Building,
    description: 'Enterprise-level administration and multi-tenant management',
    color: 'violet',
    order: -3, // Show at very top for Enterprise Admins
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
  // ==================== RETAIL CLIENT MANAGEMENT PAGES ====================
  {
    id: 'super-admin-dashboard',
    name: 'Dashboard',
    path: '/super-admin',
    iconKey: "LayoutDashboard",
    module: 'super-admin',
    permissions: ['user-management'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Retail Client Management Dashboard',
    order: 0,
  },
  {
    id: 'super-admin-user-management',
    name: 'Client Management',
    path: '/super-admin/system/user-management',
    iconKey: "Users",
    module: 'super-admin',
    permissions: ['user-management'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Manage clients, permissions and roles',
    order: 1,
  },
  {
    id: 'super-admin-permission-manager',
    name: 'Permission Manager',
    path: '/super-admin/system/permission-manager',
    iconKey: "Key",
    module: 'super-admin',
    permissions: ['user-management'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    showInSidebar: false, // Hidden - already mapped in Client Management
    description: 'Manage system permissions',
    order: 3,
  },
  {
    id: 'super-admin-roles-users-report',
    name: 'Modules & Roles',
    path: '/super-admin/system/roles-users-report',
    iconKey: "LayoutGrid",
    module: 'super-admin',
    permissions: ['user-management'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    showInSidebar: false, // Hidden - already mapped in Client Management
    description: 'View comprehensive report of all roles and assigned users',
    order: 4,
  },
  {
    id: 'super-admin-pages-roles-report',
    name: 'Pages & Roles Report',
    path: '/super-admin/system/pages-roles-report',
    iconKey: "FileText",
    module: 'super-admin',
    permissions: ['user-management'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'View assigned pages and their roles (filtered by assignment)',
    order: 5,
  },
  {
    id: 'enterprise-admin-pages-roles-report',
    name: 'All Pages & Roles Report',
    path: '/enterprise-admin/system/pages-roles-report',
    iconKey: "FileText",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'View ALL pages and their assigned roles (full system view)',
    order: 5,
  },
  {
    id: 'enterprise-admin-dashboard',
    name: 'Enterprise Dashboard',
    path: '/enterprise-admin/dashboard',
    iconKey: "LayoutDashboard",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Enterprise-level dashboard and metrics',
    order: 1,
  },
  {
    id: 'enterprise-admin-modules',
    name: 'Module Management',
    path: '/enterprise-admin/modules',
    iconKey: "Layers",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Manage ERP modules and features',
    order: 2,
  },
  {
    id: 'enterprise-admin-super-admins',
    name: 'Super Admins',
    path: '/enterprise-admin/super-admins',
    iconKey: "Users",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Manage super admin accounts',
    order: 3,
  },
  {
    id: 'enterprise-admin-logs',
    name: 'System Logs',
    path: '/enterprise-admin/logs',
    iconKey: "ScrollText",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'View system logs and audit trail',
    order: 4,
  },
  {
    id: 'enterprise-admin-activity-logs',
    name: 'Activity Logs',
    path: '/enterprise-admin/activity-logs',
    iconKey: "Activity",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'View user activity logs',
    order: 5,
  },
  {
    id: 'enterprise-admin-page-governance',
    name: 'Page Governance',
    path: '/enterprise-admin/page-governance',
    iconKey: "Shield",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    showInSidebar: true,
    description: 'View and audit all registered pages in the ERP',
    order: 6,
  },
  {
    id: 'enterprise-admin-billing',
    name: 'Billing Management',
    path: '/enterprise-admin/billing',
    iconKey: "CreditCard",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Manage tenant billing and subscriptions',
    order: 6,
  },
  {
    id: 'enterprise-admin-settings',
    name: 'Enterprise Settings',
    path: '/enterprise-admin/settings',
    iconKey: "Settings",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Configure enterprise-wide settings',
    order: 7,
  },
  {
    id: 'enterprise-admin-monitoring',
    name: 'System Monitoring',
    path: '/enterprise-admin/monitoring',
    iconKey: "Monitor",
    module: 'enterprise-admin',
    permissions: ['enterprise-admin'],
    roles: ['ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Monitor system health and performance',
    order: 8,
  },
  {
    id: 'super-admin-backup-restore',
    name: 'Backup & Restore',
    path: '/super-admin/system/backup-restore',
    iconKey: "Database",
    module: 'super-admin',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Manage system backups and restoration',
    order: 7,
  },
  {
    id: 'super-admin-system-health',
    name: 'System Health',
    path: '/super-admin/system/system-health-dashboard',
    iconKey: "Activity",
    module: 'super-admin',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Monitor system performance and health',
    order: 8,
  },
  {
    id: 'super-admin-integration-settings',
    name: 'Integration Settings',
    path: '/super-admin/system/integration-settings',
    iconKey: "Route",
    module: 'super-admin',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Configure third-party integrations',
    order: 9,
  },
  {
    id: 'super-admin-deployment-tools',
    name: 'Deployment Tools',
    path: '/super-admin/system/deployment-tools',
    iconKey: "Upload",
    module: 'super-admin',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Manage deployments and releases',
    order: 10,
  },
  {
    id: 'super-admin-about-me',
    name: 'About Me',
    path: '/super-admin/system/about-me',
    iconKey: "User",
    module: 'super-admin',
    permissions: ['authenticated'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    showInSidebar: false, // Hidden from sidebar - accessible via user menu
    description: 'View and edit your profile',
    order: 12,
  },

  // ==================== ADMIN/SYSTEM MODULE (for ADMIN roles) ====================
  {
    id: 'user-management',
    name: 'Client Management',
    path: '/system/user-management',
    iconKey: "Users",
    module: 'system',
    permissions: ['user-management'],
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
    status: 'active',
  description: 'Manage ERP clients and quick-access their Admin login',
    order: 2,
  },
  {
    id: 'user-creation',
    name: 'Create New User',
    path: '/system/user-creation',
    iconKey: "UserPlus",
    module: 'system',
    permissions: ['user-management', 'hr-management'],
  roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'],
    status: 'active',
    showInSidebar: false,
    description: 'Two-stage user creation with KYC workflow - HR creates request and sends KYC link or creates user immediately',
    order: 2.5,
  },
  {
    id: 'permission-manager',
    name: 'Permission Manager',
    path: '/system/permission-manager',
  iconKey: "Key",
    module: 'system',
    permissions: ['user-management'],
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
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
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
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
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
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
    roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
    status: 'active',
    description: 'Interactive matrix and visual explorer for roles, workflows, and test scenarios',
    order: 5.5,
  },
  // ==================== COMPLIANCE & LEGAL (Agreements) ====================
  {
    id: 'admin-branches',
    name: 'Branches',
    path: '/admin/branches',
  iconKey: "Building2",
    module: 'compliance',
    permissions: ['branch-view', 'contract-view'],
    roles: ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'LEGAL', 'COMPLIANCE'],
    status: 'active',
    description: 'Branch details, agreements, compliance & financial exposure',
    order: 20,
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    path: '/system/audit-logs',
  iconKey: "Activity",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'IT ADMIN'],
    status: 'active',
    description: 'View system activity and audit trails',
    order: 5,
  },
  {
    id: 'audit-integrity',
    name: 'Audit Integrity',
    path: '/system/audit-integrity-dashboard',
    iconKey: "ShieldCheck",
    module: 'system',
    permissions: ['governance-access'],
    roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
    status: 'active',
    description: 'Validate audit log integrity for compliance',
    order: 5.5,
  },

  // ==================== GOVERNANCE PAGES (Enterprise Admin & Super Admin) ====================
  {
    id: 'governance-security-overview',
    name: 'Security Overview',
    path: '/governance/security-overview',
    iconKey: "Shield",
    module: 'governance',
    permissions: ['governance-access'],
    roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
    status: 'active',
    description: 'Monitor system security health at a glance',
    order: 1,
  },
  {
    id: 'governance-audit-integrity',
    name: 'Audit Integrity',
    path: '/governance/audit-integrity',
    iconKey: "FileCheck",
    module: 'governance',
    permissions: ['governance-access'],
    roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
    status: 'active',
    description: 'Verify audit log completeness for compliance',
    order: 2,
  },
  {
    id: 'governance-security-violations',
    name: 'Security Violations',
    path: '/governance/security-violations',
    iconKey: "ShieldX",
    module: 'governance',
    permissions: ['governance-access'],
    roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
    status: 'active',
    description: 'Review access denials and security events',
    order: 3,
  },
  {
    id: 'governance-rbac-structure',
    name: 'RBAC Structure',
    path: '/governance/rbac-structure',
    iconKey: "Lock",
    module: 'governance',
    permissions: ['governance-access'],
    roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
    status: 'active',
    description: 'Understand role hierarchy and access control',
    order: 4,
  },

  // ==================== INTERNAL OPERATIONS PAGES (BISMAN Staff Only) ====================
  {
    id: 'internal-teams-management',
    name: 'Internal Teams',
    path: '/internal/teams',
    iconKey: "Users",
    module: 'internal',
    permissions: ['internal-operations'],
    roles: ['BISMAN_FINANCE', 'BISMAN_BILLING', 'BISMAN_SUPPORT', 'BISMAN_ENGINEERING', 'BISMAN_CUSTOMER_CARE', 'ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Manage BISMAN internal team members and roles',
    order: 1,
  },
  {
    id: 'internal-support-sessions',
    name: 'Support Sessions',
    path: '/internal/support-sessions',
    iconKey: "Headphones",
    module: 'internal',
    permissions: ['internal-operations'],
    roles: ['BISMAN_SUPPORT', 'BISMAN_CUSTOMER_CARE', 'ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Manage time-limited customer support sessions',
    order: 2,
  },
  {
    id: 'internal-customer-assistance',
    name: 'Customer Assistance',
    path: '/internal/customers',
    iconKey: "HelpCircle",
    module: 'internal',
    permissions: ['internal-operations'],
    roles: ['BISMAN_SUPPORT', 'BISMAN_CUSTOMER_CARE', 'ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'View and assist customer accounts with audit logging',
    order: 3,
  },
  {
    id: 'internal-support-playbooks',
    name: 'Support Playbooks',
    path: '/internal/playbooks',
    iconKey: "BookOpen",
    module: 'internal',
    permissions: ['internal-operations'],
    roles: ['BISMAN_FINANCE', 'BISMAN_BILLING', 'BISMAN_SUPPORT', 'BISMAN_ENGINEERING', 'BISMAN_CUSTOMER_CARE', 'ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Step-by-step guides for handling common support scenarios',
    order: 4,
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
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
    status: 'active',
    description: 'Manage system backups and restoration',
    order: 6,
  },
  {
    id: 'system-health',
    name: 'System Health',
    path: '/system/system-health-dashboard',
  iconKey: "Activity",
    module: 'system',
    permissions: ['system-settings'],
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'IT ADMIN'],
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
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
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
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR', 'IT ADMIN'],
    status: 'active',
    description: 'View and manage system error logs',
    order: 10,
  },
  {
    id: 'trust-security',
    name: 'Trust & Security',
    path: '/trust-security',
    iconKey: "Shield",
    module: 'system',
    permissions: [], // Public informational page for all authenticated users
    roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'OPERATOR', 'VIEWER', 'AUDITOR', 'HUB_INCHARGE', 'STORE_INCHARGE', 'FINANCE_CONTROLLER', 'CFO', 'CEO'],
    status: 'active',
    showInSidebar: false, // Integrated into User Settings page
    description: 'Learn how BISMAN ERP keeps your data safe and private',
    order: 10.5,
  },
  {
    id: 'fallback-recovery',
    name: 'Fallback & Recovery',
    path: '/super-admin/system/fallback-recovery',
    iconKey: "AlertTriangle",
    module: 'super-admin',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Investigate failures, roll back to safety, and restore system stability',
    order: 11,
  },
  // Super Admin Module Pages
  {
    id: 'security',
    name: 'Security Management',
    path: '/super-admin/security',
    iconKey: "Shield",
    module: 'super-admin',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Security settings and monitoring',
    order: 2,
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    path: '/super-admin/subscriptions',
    iconKey: "CreditCard",
    module: 'subscriptions',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Subscription management console',
    order: 3,
  },
  {
    id: 'subscription-plans',
    name: 'Plan Management',
    path: '/super-admin/subscriptions/plans',
    iconKey: "Package",
    module: 'subscriptions',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Create and manage subscription plans',
    order: 3,
    showInSidebar: false, // Sub-page of subscriptions
  },
  {
    id: 'subscription-tenants',
    name: 'Tenant Subscriptions',
    path: '/super-admin/subscriptions/tenants',
    iconKey: "Building2",
    module: 'subscriptions',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Manage tenant subscription status',
    order: 3,
    showInSidebar: false, // Sub-page of subscriptions
  },
  {
    id: 'subscription-billing',
    name: 'Billing Overrides',
    path: '/super-admin/subscriptions/billing',
    iconKey: "DollarSign",
    module: 'subscriptions',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Apply custom billing and overrides',
    order: 3,
    showInSidebar: false, // Sub-page of subscriptions
  },
  {
    id: 'subscription-audit',
    name: 'Subscription Audit',
    path: '/super-admin/subscriptions/audit',
    iconKey: "FileText",
    module: 'subscriptions',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'View subscription audit logs',
    order: 3,
    showInSidebar: false, // Sub-page of subscriptions
  },
  {
    id: 'subscription-coupons',
    name: 'Coupons',
    path: '/super-admin/subscriptions/coupons',
    iconKey: "Ticket",
    module: 'subscriptions',
    permissions: ['system-settings'],
    roles: ['SUPER_ADMIN'],
    status: 'active',
    description: 'Manage subscription activation coupons',
    order: 4,
    showInSidebar: false, // Sub-page of subscriptions
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
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
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
  roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM ADMINISTRATOR'],
    status: 'active',
    description: 'Manage deployments and releases',
    order: 12,
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
  {
    id: 'bank-reconciliation-list',
    name: 'Bank Reconciliation',
    path: '/reconciliation',
    iconKey: "FileCheck",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'ACCOUNTS_PAYABLE', 'BANKER', 'TREASURY', 'ADMIN'],
    status: 'active',
    description: 'Bank statement reconciliation batches',
    order: 32,
  },
  {
    id: 'bank-reconciliation-upload',
    name: 'Upload Statement',
    path: '/reconciliation/upload',
    iconKey: "Upload",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['ACCOUNTS', 'ACCOUNTS_PAYABLE', 'BANKER', 'ADMIN'],
    status: 'active',
    description: 'Upload bank statements for reconciliation',
    order: 33,
    showInSidebar: false,
  },
  {
    id: 'settlements-list',
    name: 'Settlements',
    path: '/settlements',
    iconKey: "Wallet",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'ACCOUNTS_PAYABLE', 'TREASURY', 'ADMIN'],
    status: 'active',
    description: 'View and manage settlements',
    order: 34,
  },
  {
    id: 'payment-summary-report',
    name: 'Payment Summary',
    path: '/reports/payment-summary',
    iconKey: "BarChart3",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS_PAYABLE', 'TREASURY', 'ADMIN'],
    status: 'active',
    description: 'Executive dashboard with payment KPIs and charts',
    order: 35,
  },
  {
    id: 'settlement-audit-report',
    name: 'Settlement Audit',
    path: '/reports/settlement-audit',
    iconKey: "ClipboardCheck",
    module: 'finance',
    permissions: ['executive-dashboard'],
    roles: ['CFO', 'FINANCE_CONTROLLER', 'AUDITOR', 'COMPLIANCE', 'ADMIN'],
    status: 'active',
    description: 'Compliance-focused settlement audit trail report',
    order: 36,
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

  // ==================== OPERATIONS MODULE ====================
  // KPI Dashboard removed per request
  {
    id: 'stock-entry',
    name: 'Stock Entry',
    path: '/operations/stock-entry',
  iconKey: "Package",
    module: 'operations',
    permissions: ['inventory-management'],
    roles: ['STORE INCHARGE', 'HUB INCHARGE', 'OPERATIONS MANAGER'],
    status: 'active',
    description: 'Record stock movements',
    order: 1,
  },
  {
    id: 'item-master',
    name: 'Item Master',
    path: '/operations/item-master-limited',
  iconKey: "Tag",
    module: 'operations',
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
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
    permissions: ['inventory-management'],
    roles: ['HUB INCHARGE', 'HUB_INCHARGE'],
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
    permissions: ['inventory-management'],
    roles: ['STORE INCHARGE', 'STORE_INCHARGE'],
    status: 'active',
    description: 'Store operations management dashboard',
    order: 101,
  },
  {
    id: 'branch-incharge-dashboard',
    name: 'Branch Dashboard',
    path: '/dashboard',
    iconKey: "Building2",
    module: 'operations',
    permissions: ['authenticated'],
    roles: ['BRANCH INCHARGE', 'BRANCH_INCHARGE'],
    status: 'active',
    description: 'Branch operations management dashboard',
    order: 0,
    showInSidebar: false, // Uses the main dashboard page
  },
  {
    id: 'branch-task-approvals',
    name: 'Task Approvals',
    path: '/common/task-approvals',
    iconKey: "FileCheck",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['BRANCH INCHARGE', 'BRANCH_INCHARGE', 'HUB INCHARGE', 'HUB_INCHARGE', 'STORE INCHARGE', 'STORE_INCHARGE', 'ADMIN', 'MANAGER'],
    status: 'active',
    showInSidebar: false, // Hidden from sidebar
    description: 'Review and approve tasks',
    order: 10,
  },
  {
    id: 'operations-manager-dashboard',
    name: 'Operations Manager Dashboard',
    path: '/operations-manager',
  iconKey: "Briefcase",
    module: 'operations',
    permissions: ['inventory-management'],
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

  // ==================== COMMON MODULE ====================
  // These pages are accessible to ALL authenticated users regardless of role
  // Removed per request: security-settings, notifications, messages, documentation, 
  // bank-accounts, calendar (non-root), task-approvals, settings, assistant
  // Common module pages - duplicated with shorter IDs for MASTER_MODULES compatibility
  {
    id: 'about-me',
    name: 'About Me',
    path: '/common/about-me',
    iconKey: "User",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ADMIN', 'HUB_INCHARGE', 'FINANCE_OFFICER', 'HR_MANAGER', 'INVENTORY_MANAGER', 'LEGAL_OFFICER'], // Exclude SUPER_ADMIN - they have their own
    status: 'active',
    showInSidebar: false, // Hidden from sidebar - accessible via user menu
    description: 'View and edit your profile',
    order: 1,
  },
  // User Settings page removed - functionality merged into Billing page
  // {
  //   id: 'common-user-settings',
  //   name: 'User Management',
  //   path: '/common/user-settings',
  //   iconKey: "Users",
  //   module: 'common',
  //   permissions: ['authenticated'],
  //   roles: ['ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_INCHARGE', 'HUB_INCHARGE', 'STORE_INCHARGE'],
  //   status: 'active',
  //   description: 'Manage users and monitor subscription usage',
  //   order: 4,
  // },
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
    order: 5,
    showInSidebar: false, // Hidden - payment requests are now created via Task form
  },
  // REMOVED: Task Clarifications and Task Reviews pages deleted
  // {
  //   id: 'task-clarifications',
  //   name: 'Task Clarifications',
  //   path: '/tasks/clarifications',
  //   ...
  // },
  // {
  //   id: 'task-reviews',
  //   name: 'Task Reviews',
  //   path: '/tasks/reviews',
  //   ...
  // },
  {
    id: 'approvals',
    name: 'Task Management',
    path: '/approvals',
    iconKey: "CheckCircle",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL'],
    status: 'active',
    description: 'View and manage pending approvals',
    order: 8,
  },
  {
    id: 'task-create',
    name: 'Create Task',
    path: '/tasks/create',
    iconKey: "Plus",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL'],
    status: 'active',
    description: 'Create a new task',
    order: 8,
    showInSidebar: false, // Accessed via dashboard
  },
  {
    id: 'global-calendar',
    name: 'Calendar',
    path: '/calendar',
    iconKey: "Calendar",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL'],
    status: 'active',
    description: 'View task deadlines and schedule',
    order: 9,
    showInSidebar: false, // Calendar is accessible from top bar
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    iconKey: "LayoutGrid",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL', 'ADMIN', 'SUPER_ADMIN'],
    status: 'active',
    description: 'View your task dashboard with Kanban board',
    order: 0, // Show at very top
  },
  {
    id: 'task-workbench',
    name: 'Task Workbench',
    path: '/dashboard/workbench',
    iconKey: "LayoutDashboard",
    module: 'common',
    permissions: ['authenticated'],
    roles: ['ALL', 'ADMIN', 'SUPER_ADMIN'],
    status: 'active',
    description: 'Manage your tasks with draft, in-progress, needs attention, and done views',
    order: 1, // Show at top of common pages
    showInSidebar: false, // Hidden - functionality now integrated into main Dashboard
  },

  // ==================== BILLING PAGES ====================
  {
    id: 'billing-overview',
    name: 'Subscription',
    path: '/billing',
    iconKey: "CreditCard",
    module: 'billing',
    permissions: ['billing-view', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'],
    status: 'active',
    description: 'View subscription, usage, and billing summary',
    order: 1,
  },
  {
    id: 'billing-invoices',
    name: 'Invoices & Payments',
    path: '/billing/invoices',
    iconKey: "FileText",
    module: 'billing',
    permissions: ['billing-view', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'OWNER'],
    status: 'active',
    description: 'View and download invoices, payment history',
    order: 2,
  },
  {
    id: 'pricing',
    name: 'Pricing',
    path: '/pricing',
    iconKey: "Tag",
    module: 'billing',
    permissions: ['public'], // Public page - no auth required
    roles: [],
    status: 'active',
    description: 'View subscription plans and pricing',
    order: 0,
    showInSidebar: false, // Public page, accessible via direct link
  },

  // ==================== ADMIN BILLING CONSOLE ====================
  {
    id: 'admin-billing-tenant',
    name: 'Tenant Billing Admin',
    path: '/admin/billing/tenants',
    iconKey: "Building2",
    module: 'admin',
    permissions: ['admin-billing'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    status: 'active',
    showInSidebar: true, // Now visible in sidebar
    description: 'Admin console for managing tenant billing',
    order: 100,
  },

  // ==================== ADMIN DASHBOARDS (SaaS Infrastructure) ====================
  {
    id: 'admin-usage-dashboard',
    name: 'Usage Dashboard',
    path: '/admin/usage',
    iconKey: "BarChart3",
    module: 'admin',
    permissions: ['admin-usage'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Monitor tenant usage and resource consumption',
    order: 10,
  },
  {
    id: 'admin-sla-dashboard',
    name: 'SLA Dashboard',
    path: '/admin/sla',
    iconKey: "Shield",
    module: 'admin',
    permissions: ['admin-sla'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Monitor SLA compliance and uptime metrics',
    order: 11,
  },
  {
    id: 'admin-audit-dashboard',
    name: 'Audit Dashboard',
    path: '/admin/audit',
    iconKey: "FileSearch",
    module: 'admin',
    permissions: ['admin-audit'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    status: 'active',
    description: 'Comprehensive audit logging and compliance tracking',
    order: 12,
  },
  {
    id: 'admin-system-flow',
    name: 'User Flow & Management',
    path: '/admin/system-flow',
    iconKey: "Workflow",
    module: 'admin',
    permissions: ['admin-dashboard', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: true,
    description: 'Visualize role hierarchy, approval flows, and organizational structure',
    order: 13,
  },
  {
    id: 'admin-task-approvals',
    name: 'Task Approvals',
    path: '/admin/task-approvals',
    iconKey: "FileCheck",
    module: 'admin',
    permissions: ['admin-dashboard', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: false, // Hidden from admin sidebar
    description: 'Manage and approve pending tasks across your organization',
    order: 14,
  },
  {
    id: 'admin-client-dashboard',
    name: 'Dashboard',
    path: '/admin',
    iconKey: "LayoutDashboard",
    module: 'admin',
    permissions: ['admin-client-usage', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: true,
    description: 'Business health, money, customers, delivery & team metrics for all clients',
    order: 1,
  },
  {
    id: 'admin-user-usage',
    name: 'User Usage Details',
    path: '/admin/user-usage',
    iconKey: "UserCheck",
    module: 'admin',
    permissions: ['admin-usage'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    status: 'active',
    showInSidebar: true, // Now visible in sidebar
    description: 'View detailed usage for a specific user',
    order: 14,
  },
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    path: '/analytics',
    iconKey: "LineChart",
    module: 'admin',
    permissions: ['admin-analytics', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    description: 'Platform analytics and insights',
    order: 14,
  },
  // REMOVED: Admin Contracts pages deleted
  // {
  //   id: 'admin-contracts',
  //   name: 'Contracts & Agreements',
  //   path: '/admin/contracts',
  //   ...
  // },
  // {
  //   id: 'admin-contracts-create',
  //   name: 'Create Contract',
  //   path: '/admin/contracts/create',
  //   ...
  // },
  {
    id: 'admin-users-create',
    name: 'Create User',
    path: '/admin/users/create',
    iconKey: "UserPlus",
    module: 'admin',
    permissions: ['admin-dashboard'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: false,
    description: 'Create a new user account',
    order: 17,
  },
  {
    id: 'admin-branches-create',
    name: 'Create Branch',
    path: '/admin/branches/create',
    iconKey: "Building2",
    module: 'admin',
    permissions: ['admin-dashboard'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: false,
    description: 'Create a new branch or location',
    order: 18,
  },
  {
    id: 'admin-bank-templates',
    name: 'Bank Templates',
    path: '/admin/bank-templates',
    iconKey: "Landmark",
    module: 'admin',
    permissions: ['admin-dashboard'],
    roles: ['SUPER_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: true,
    description: 'Manage bank statement import templates',
    order: 19,
  },
  {
    id: 'admin-clients',
    name: 'Client Management',
    path: '/admin/clients',
    iconKey: "Users",
    module: 'admin',
    permissions: ['admin-dashboard'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    status: 'active',
    showInSidebar: true,
    description: 'Manage client accounts and permissions',
    order: 20,
  },
  {
    id: 'admin-settings',
    name: 'Admin Settings',
    path: '/admin/settings',
    iconKey: "Settings",
    module: 'admin',
    permissions: ['admin-dashboard'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: true,
    description: 'Configure admin settings',
    order: 21,
  },
  // ==================== QA & TESTING MODULE (HIDDEN - Internal Testing Only) ====================
  {
    id: 'qa-dashboard',
    name: 'QA Dashboard',
    path: '/qa',
    iconKey: "LayoutDashboard",
    module: 'qa',
    permissions: ['qa-access', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'QA_TESTER', 'DEVELOPER'],
    status: 'active',
    showInSidebar: false, // Hidden - QA module is for internal testing only
    description: 'QA Dashboard - overview of testing tasks and issues',
    badge: 'New',
    order: 1,
  },
  {
    id: 'qa-test-tasks',
    name: 'Test Tasks',
    path: '/qa/test-tasks',
    iconKey: "ClipboardList",
    module: 'qa',
    permissions: ['qa-access', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'QA_TESTER', 'DEVELOPER'],
    status: 'active',
    showInSidebar: false, // Hidden - QA module is for internal testing only
    description: 'View and manage test assignments',
    order: 2,
  },
  {
    id: 'qa-issues',
    name: 'Bug Tracker',
    path: '/qa/issues',
    iconKey: "Bug",
    module: 'qa',
    permissions: ['qa-access', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'QA_TESTER', 'DEVELOPER'],
    status: 'active',
    showInSidebar: false, // Hidden - QA module is for internal testing only
    description: 'Track bugs and issues found during testing',
    order: 3,
  },
  {
    id: 'qa-new-task',
    name: 'New Test Task',
    path: '/qa/test-tasks/new',
    iconKey: "Plus",
    module: 'qa',
    permissions: ['qa-access', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'],
    status: 'active',
    showInSidebar: false,
    description: 'Create a new test task',
    order: 4,
  },
  {
    id: 'qa-new-issue',
    name: 'Report Issue',
    path: '/qa/issues/new',
    iconKey: "AlertCircle",
    module: 'qa',
    permissions: ['qa-access', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'QA_TESTER', 'DEVELOPER'],
    status: 'active',
    showInSidebar: false,
    description: 'Report a new bug or issue',
    order: 5,
  },
  {
    id: 'qa-role-access-explorer',
    name: 'Role & Access Explorer',
    path: '/qa/role-access-explorer',
    iconKey: "Shield",
    module: 'qa',
    permissions: ['qa-access', 'authenticated'],
    roles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'QA_TESTER', 'DEVELOPER'],
    status: 'active',
    showInSidebar: false, // Hidden - QA module is for internal testing only
    badge: 'Live',
    description: 'Explore ERP roles, permissions, routes with live data sync',
    order: 6,
  },
];

/**
 * Get pages for a specific module
 */
export function getPagesByModule(moduleId: string): PageMetadata[] {
  return PAGE_REGISTRY
    .filter(page => page.module === moduleId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

// REMOVED: Contracts page deleted
// export const CONTRACTS_PAGE = { ... }

/**
 * Get pages accessible by a user's permissions
 */
export function getAccessiblePages(userPermissions: string[]): PageMetadata[] {
  return PAGE_REGISTRY.filter(page =>
    page.permissions.some(perm => 
      perm === 'authenticated' || userPermissions.includes(perm)
    )
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
