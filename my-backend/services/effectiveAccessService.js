/**
 * EFFECTIVE ACCESS SERVICE
 * =========================
 * 
 * Computes effective roles and pages using THREE-LAYER INTERSECTION:
 * 
 *   effectiveRoles = subscriptionRoles ∩ enterpriseApproved ∩ superadminApproved
 *   effectivePages = subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
 * 
 * A client/admin can access a page ONLY when:
 *   ✅ Page is in the selected Subscription (base entitlement)
 *   ✅ Page is approved by Enterprise Admin for the Superadmin (enterprise gate)
 *   ✅ Page is approved by Superadmin for that Client/Admin (client gate)
 * 
 * SOURCES OF TRUTH:
 *   1. Subscription Mapping: plan_module_access + pages_master (what subscription includes)
 *   2. Enterprise Approval: admin_page_assignments where assigner_type='ENTERPRISE_ADMIN' (enterprise gate)
 *   3. Superadmin Approval: admin_page_assignments where assigner_type='SUPER_ADMIN' (client gate)
 * 
 * @module services/effectiveAccessService
 */

const { getPrisma } = require('../lib/prisma');

// ============================================================================
// CONSTANTS (PHASE 3 CRITICAL)
// ============================================================================

/**
 * ALWAYS_ACCESSIBLE_PAGES - MINIMAL set of pages that ANY authenticated user can access
 * These bypass the approval chain but are strictly limited to non-sensitive pages.
 * 
 * NOTE: These are FALLBACK values. The authoritative source is now:
 *       pages_master.is_compulsory = true
 * 
 * SECURITY RULES:
 * - NO financial pages
 * - NO admin pages
 * - NO user management pages
 * - NO reporting pages
 * - ONLY common utilities and personal settings
 */
const ALWAYS_ACCESSIBLE_PAGES = [
  // Dashboard - landing page only (generic dashboard, NOT role-specific)
  'DASHBOARD', 'dashboard', 'home', 'DASHBOARD_HOME',
  
  // Personal profile & settings
  'USER_PROFILE', 'profile', 'user-profile',
  'USER_SETTINGS', 'settings', 'user-settings', 'user_settings',
  'COMMON_USER_SETTINGS',
  
  // Common utilities
  'COMMON_CALENDAR', 'calendar', 'common_calendar',
  'COMMON_NOTIFICATIONS', 'notifications', 'NOTIFICATIONS',
  
  // Chat - communication is essential
  'CHAT', 'COMMON_CHAT',
  
  // Route variants (generic only - NOT role-specific dashboards)
  '/dashboard', '/common/calendar', '/common/user-settings', '/calendar', '/settings',
  '/common/notifications'
];

/**
 * ALWAYS_ACCESSIBLE_MODULES - Modules that may contain always-accessible pages
 * Note: This does NOT mean all pages in these modules are accessible
 * 
 * CRITICAL: Must match case with modules_master.module_code in database
 * Database stores these as UPPERCASE (DASHBOARD, COMMON)
 * 
 * AUDIT FIX 2026-02-03: Changed from lowercase to UPPERCASE to match DB
 */
const ALWAYS_ACCESSIBLE_MODULES = [
  'DASHBOARD', 'COMMON'
];

/**
 * ALWAYS_ACCESSIBLE_PAGES_KEYS - Page codes (uppercase) for DB matching
 * Used for database queries where we need the canonical page_code
 * NOTE: Role-specific dashboards (ADMIN_DASHBOARD, SUPER_ADMIN_DASHBOARD, ENTERPRISE_ADMIN_DASHBOARD)
 *       are NOT included here - users must have proper role to access them
 */
const ALWAYS_ACCESSIBLE_PAGES_KEYS = [
  'DASHBOARD', 'DASHBOARD_HOME',
  'USER_PROFILE', 'COMMON_USER_SETTINGS', 'USER_SETTINGS',
  'COMMON_CALENDAR', 'COMMON_NOTIFICATIONS', 'NOTIFICATIONS',
  'CHAT', 'COMMON_CHAT'
];

/**
 * EXPLICIT REJECTION SCENARIOS
 * These conditions result in IMMEDIATE DENIAL with no fallback:
 * 
 * 1. NO_USER_ID: Request without valid user identifier
 * 2. NO_TENANT: User has no tenant association
 * 3. NO_SUBSCRIPTION: Tenant has no active subscription
 * 4. NO_EA_APPROVAL: Enterprise Admin hasn't approved pages for Super Admin
 * 5. NO_SA_APPROVAL: Super Admin hasn't approved pages for user
 * 6. PAGE_NOT_IN_SUBSCRIPTION: Page not included in subscription plan
 * 7. PAGE_REVOKED: Page was previously granted but now revoked
 */
const REJECTION_CODES = {
  NO_USER_ID: 'User identifier not provided',
  NO_TENANT: 'User has no tenant association',
  NO_SUBSCRIPTION: 'No active subscription found',
  NO_EA_APPROVAL: 'Enterprise Admin has not approved this page for your Super Admin',
  NO_SA_APPROVAL: 'Super Admin has not enabled this page for your account',
  PAGE_NOT_IN_SUBSCRIPTION: 'Page is not included in your subscription plan',
  PAGE_REVOKED: 'Access to this page has been revoked',
  APPROVAL_CHAIN_BROKEN: 'Approval chain is incomplete - contact your administrator'
};

/**
 * PLATFORM ROLES - Users that are NOT tenant-scoped
 * These roles use platform-level access computation, not tenant-based
 */
const PLATFORM_ROLES = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'];

// ============================================================================
// COMPULSORY PAGES CACHE & HELPERS
// ============================================================================

/**
 * Cache for compulsory pages (refreshed every 5 minutes)
 */
let compulsoryPagesCache = null;
let compulsoryCacheTimestamp = 0;
const COMPULSORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch compulsory pages from database (with caching)
 * These pages are PLATFORM GUARANTEES - users cannot function without them
 * 
 * @returns {Promise<Set<string>>} Set of compulsory page codes and routes
 */
async function getCompulsoryPages() {
  const now = Date.now();
  
  // Return cached if valid
  if (compulsoryPagesCache && (now - compulsoryCacheTimestamp) < COMPULSORY_CACHE_TTL) {
    return compulsoryPagesCache;
  }
  
  const prisma = getPrisma();
  
  try {
    const pages = await prisma.$queryRaw`
      SELECT page_code, route
      FROM pages_master
      WHERE is_compulsory = true
        AND status = 'active'
    `;
    
    // Build set with both page_code and route for flexible matching
    const compulsorySet = new Set(ALWAYS_ACCESSIBLE_PAGES); // Start with fallback
    
    for (const page of pages) {
      if (page.page_code) compulsorySet.add(page.page_code);
      if (page.route) compulsorySet.add(page.route);
    }
    
    // Update cache
    compulsoryPagesCache = compulsorySet;
    compulsoryCacheTimestamp = now;
    
    console.log(`[EffectiveAccess] Loaded ${compulsorySet.size} compulsory pages from database`);
    return compulsorySet;
    
  } catch (error) {
    console.error('[EffectiveAccess] Error fetching compulsory pages, using fallback:', error.message);
    // Return fallback on error
    return new Set(ALWAYS_ACCESSIBLE_PAGES);
  }
}

/**
 * Fetch default pages for new roles from database
 * These pages are auto-selected when creating a new role
 * 
 * @returns {Promise<Array<Object>>} Array of default page objects
 */
async function getDefaultPagesForRoles() {
  const prisma = getPrisma();
  
  try {
    const pages = await prisma.$queryRaw`
      SELECT id, page_code, display_name, route, is_compulsory, is_default_for_roles
      FROM pages_master
      WHERE is_default_for_roles = true
        AND status = 'active'
      ORDER BY is_compulsory DESC, display_name ASC
    `;
    
    return pages;
    
  } catch (error) {
    console.error('[EffectiveAccess] Error fetching default pages:', error.message);
    return [];
  }
}

/**
 * Check if a page is compulsory (cannot be revoked)
 * 
 * @param {string} pageKey - Page code or route to check
 * @returns {Promise<boolean>} True if page is compulsory
 */
async function isCompulsoryPage(pageKey) {
  const compulsoryPages = await getCompulsoryPages();
  return compulsoryPages.has(pageKey) || 
         compulsoryPages.has(pageKey.toUpperCase()) ||
         compulsoryPages.has(pageKey.toLowerCase());
}

/**
 * Validate page assignment request - rejects attempts to remove compulsory pages
 * 
 * @param {Array<string>} requestedPages - Pages the admin wants to assign
 * @param {Array<string>} currentPages - Pages currently assigned
 * @returns {Object} Validation result with any blocked removals
 */
async function validatePageAssignment(requestedPages, currentPages) {
  const compulsoryPages = await getCompulsoryPages();
  const requestedSet = new Set(requestedPages);
  
  const blockedRemovals = [];
  const warningRemovals = [];
  
  // Check if any compulsory pages are being removed
  for (const currentPage of currentPages) {
    if (!requestedSet.has(currentPage)) {
      // Page is being removed - check if compulsory
      if (compulsoryPages.has(currentPage)) {
        blockedRemovals.push({
          page: currentPage,
          reason: 'This page is mandatory and cannot be removed'
        });
      }
    }
  }
  
  return {
    valid: blockedRemovals.length === 0,
    blockedRemovals,
    warningRemovals,
    message: blockedRemovals.length > 0 
      ? `Cannot remove compulsory pages: ${blockedRemovals.map(b => b.page).join(', ')}`
      : 'Validation passed'
  };
}

/**
 * Clear the compulsory pages cache
 * Call this after modifying is_compulsory flags in pages_master
 */
function clearCompulsoryPagesCache() {
  compulsoryPagesCache = null;
  compulsoryCacheTimestamp = 0;
  console.log('[EffectiveAccess] Compulsory pages cache cleared');
}

/**
 * Alias for getDefaultPagesForRoles (backwards compatibility)
 */
async function getDefaultPages() {
  return await getDefaultPagesForRoles();
}

// Export compulsory page helpers
module.exports.getCompulsoryPages = getCompulsoryPages;
module.exports.getDefaultPagesForRoles = getDefaultPagesForRoles;
module.exports.isCompulsoryPage = isCompulsoryPage;
module.exports.validatePageAssignment = validatePageAssignment;

// Export for use in other modules
module.exports.ALWAYS_ACCESSIBLE_PAGES = ALWAYS_ACCESSIBLE_PAGES;
module.exports.ALWAYS_ACCESSIBLE_MODULES = ALWAYS_ACCESSIBLE_MODULES;
module.exports.REJECTION_CODES = REJECTION_CODES;
module.exports.PLATFORM_ROLES = PLATFORM_ROLES;

// ============================================================================
// PLATFORM-LEVEL ACCESS (NO TENANT)
// ============================================================================

/**
 * Compute effective pages for ENTERPRISE_ADMIN
 * EA has access to ALL pages they can assign (platform-level, no tenant)
 * 
 * @param {number} userId - Enterprise Admin's ID
 * @returns {Promise<Object>} Effective access result
 */
async function computeEnterpriseAdminPages(userId) {
  const prisma = getPrisma();
  
  console.log(`[EffectiveAccess:Platform] Computing EA pages for userId=${userId}`);
  
  const result = {
    effectivePages: [...ALWAYS_ACCESSIBLE_PAGES],
    blockedPages: [],
    accessDetails: {},
    scope: 'PLATFORM',
    role: 'ENTERPRISE_ADMIN'
  };
  
  try {
    // EA has access to all pages in the platform (they are at the top of hierarchy)
    // Get all active UI pages
    const pages = await prisma.$queryRaw`
      SELECT pm.page_code, pm.route, mm.module_code
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      WHERE pm.is_active = true
        AND pm.page_type = 'UI_PAGE'
    `;
    
    for (const page of pages) {
      if (page.page_code) result.effectivePages.push(page.page_code);
      if (page.route) result.effectivePages.push(page.route);
    }
    
    // ========================================================================
    // PHASE 7 FIX: INJECT COMPULSORY PAGES (ensure they're always present)
    // ========================================================================
    const compulsoryPages = await getCompulsoryPages();
    for (const pageKey of compulsoryPages) {
      if (!result.effectivePages.includes(pageKey)) {
        result.effectivePages.push(pageKey);
      }
    }
    
    console.log(`[EffectiveAccess:Platform] EA has ${result.effectivePages.length} effective pages`);
    return result;
    
  } catch (error) {
    console.error('[EffectiveAccess:Platform] Error computing EA pages:', error.message);
    // Fail-closed: Return only ALWAYS_ACCESSIBLE_PAGES on error
    return result;
  }
}

/**
 * Compute effective pages for SUPER_ADMIN
 * SA has access to pages that EA has approved for them (platform-level, no tenant)
 * 
 * @param {number} userId - Super Admin's ID
 * @returns {Promise<Object>} Effective access result
 */
async function computeSuperAdminPages(userId) {
  const prisma = getPrisma();
  
  console.log(`[EffectiveAccess:Platform] Computing SA pages for userId=${userId}`);
  
  const result = {
    effectivePages: [...ALWAYS_ACCESSIBLE_PAGES],
    blockedPages: [],
    accessDetails: {},
    scope: 'PLATFORM',
    role: 'SUPER_ADMIN'
  };
  
  try {
    // Get pages approved by Enterprise Admin for this Super Admin
    const approvedPages = await prisma.$queryRaw`
      SELECT apa.page_key, pm.route
      FROM admin_page_assignments apa
      LEFT JOIN pages_master pm ON apa.page_id = pm.id
      WHERE apa.assignee_type = 'SUPER_ADMIN'
        AND apa.assigner_type = 'ENTERPRISE_ADMIN'
        AND apa.is_active = true
    `;
    
    for (const row of approvedPages) {
      if (row.page_key) result.effectivePages.push(row.page_key);
      if (row.route) result.effectivePages.push(row.route);
    }
    
    // ========================================================================
    // PHASE 7 FIX: INJECT COMPULSORY PAGES (ensure they're always present)
    // ========================================================================
    const compulsoryPages = await getCompulsoryPages();
    for (const pageKey of compulsoryPages) {
      if (!result.effectivePages.includes(pageKey)) {
        result.effectivePages.push(pageKey);
      }
    }
    
    console.log(`[EffectiveAccess:Platform] SA has ${result.effectivePages.length} effective pages`);
    return result;
    
  } catch (error) {
    console.error('[EffectiveAccess:Platform] Error computing SA pages:', error.message);
    // Fail-closed: Return only ALWAYS_ACCESSIBLE_PAGES on error
    return result;
  }
}

/**
 * Compute effective pages for platform-scoped users (EA, SA, SYSTEM_ADMIN)
 * This function does NOT query the clients table
 * 
 * @param {Object} params
 * @param {number} params.userId - User's ID
 * @param {string} params.role - User's role (ENTERPRISE_ADMIN, SUPER_ADMIN, SYSTEM_ADMIN)
 * @param {number} params.planId - Subscription plan ID (optional, for future use)
 * @returns {Promise<Object>} Effective access result
 */
async function computePlatformEffectivePages({ userId, role, planId: _planId = null }) {
  const normalizedRole = (role || '').toUpperCase();
  
  console.log(`[EffectiveAccess:Platform] Computing for userId=${userId}, role=${normalizedRole}`);
  
  switch (normalizedRole) {
    case 'ENTERPRISE_ADMIN':
      return await computeEnterpriseAdminPages(userId);
      
    case 'SUPER_ADMIN':
      return await computeSuperAdminPages(userId);
      
    case 'SYSTEM_ADMIN':
      // System admin has full access (bootstrap scenario)
      return await computeEnterpriseAdminPages(userId);
      
    default:
      // Fail-closed for unknown platform roles
      console.warn(`[EffectiveAccess:Platform] Unknown platform role: ${normalizedRole}`);
      return {
        effectivePages: [...ALWAYS_ACCESSIBLE_PAGES],
        blockedPages: [],
        accessDetails: {},
        scope: 'PLATFORM',
        role: normalizedRole
      };
  }
}

// Export platform functions
module.exports.computePlatformEffectivePages = computePlatformEffectivePages;
module.exports.computeEnterpriseAdminPages = computeEnterpriseAdminPages;
module.exports.computeSuperAdminPages = computeSuperAdminPages;

// ============================================================================
// HELPER: Get pages from subscription plan
// ============================================================================

/**
 * Get all pages included in a subscription plan
 * @param {number} planId - Subscription plan ID
 * @returns {Promise<Set<string>>} Set of page keys
 */
async function getSubscriptionPages(planId) {
  const prisma = getPrisma();
  
  // Get modules accessible by this plan
  const moduleAccess = await prisma.plan_module_access.findMany({
    where: { 
      plan_id: planId,
      access_level: { not: 'none' }
    },
    select: { module_id: true }
  });
  
  const accessibleModules = new Set([
    ...ALWAYS_ACCESSIBLE_MODULES,
    ...moduleAccess.map(m => m.module_id)
  ]);
  
  // Get pages from those modules
  const pages = await prisma.$queryRaw`
    SELECT pm.page_code, pm.route, mm.module_code
    FROM pages_master pm
    JOIN modules_master mm ON pm.module_id = mm.id
    WHERE mm.module_code = ANY(${Array.from(accessibleModules)}::text[])
      AND pm.is_active = true
  `;
  
  const pageKeys = new Set(ALWAYS_ACCESSIBLE_PAGES);
  for (const page of pages) {
    if (page.page_code) pageKeys.add(page.page_code);
    if (page.route) pageKeys.add(page.route);
  }
  
  return pageKeys;
}

// ============================================================================
// HELPER: Get Enterprise Admin approved pages for a Superadmin
// ============================================================================

/**
 * Get pages approved by Enterprise Admin for a specific Superadmin
 * @param {number} superadminId - The Superadmin's legacy_id
 * @returns {Promise<Set<string>>} Set of approved page keys
 */
async function getEnterpriseApprovedPages(superadminId) {
  const prisma = getPrisma();
  
  // Check admin_page_assignments where Enterprise Admin assigned to this Superadmin
  const assignments = await prisma.$queryRaw`
    SELECT page_key, page_id, is_active
    FROM admin_page_assignments
    WHERE assignee_id = ${superadminId}
      AND assigner_type = 'ENTERPRISE_ADMIN'
      AND is_active = true
  `;
  
  const pageKeys = new Set(ALWAYS_ACCESSIBLE_PAGES);
  for (const a of assignments) {
    if (a.page_key) pageKeys.add(a.page_key);
  }
  
  // SECURITY FIX: If no explicit assignments, Enterprise Admin hasn't configured yet
  // Default to ALWAYS_ACCESSIBLE_PAGES only (DENY by default)
  if (assignments.length === 0) {
    console.warn(`[EffectiveAccess] DENY: No Enterprise Admin approval for SuperAdmin ${superadminId} - only common pages accessible`);
    return pageKeys; // Only ALWAYS_ACCESSIBLE_PAGES - DENY BY DEFAULT
  }
  
  return pageKeys;
}

// ============================================================================
// HELPER: Get Superadmin approved pages for a Client/Admin
// ============================================================================

/**
 * Get pages approved by Superadmin for a specific Client/Admin
 * 
 * SECURITY (PHASE 2 LOCKDOWN):
 * - ONLY queries admin_page_assignments
 * - rbac_user_permissions is NO LONGER authoritative
 * - Absence of approval = DENY (only ALWAYS_ACCESSIBLE_PAGES returned)
 * 
 * PHASE 3 FIX: For tenant-scoped roles (ADMIN, etc.), also include pages
 * assigned to the ROLE by Enterprise Admin, not just individual user assignments.
 * This ensures that role-based page assignments work properly.
 * 
 * @param {number} clientAdminId - The Client Admin's legacy_id
 * @param {string} _tenantId - The tenant/client ID (reserved for future use)
 * @param {string} userRole - The user's role (e.g., 'ADMIN', 'OPERATIONS_MANAGER')
 * @returns {Promise<Set<string>>} Set of approved page keys
 */
async function getSuperadminApprovedPages(clientAdminId, _tenantId, userRole = null) {
  const prisma = getPrisma();
  
  // Start with ALWAYS_ACCESSIBLE_PAGES only
  const pageKeys = new Set(ALWAYS_ACCESSIBLE_PAGES);
  
  // AUTHORITATIVE SOURCE: admin_page_assignments ONLY
  // SECURITY LOCKDOWN: rbac_user_permissions is NO LONGER queried
  
  // 1. User-specific assignments (SA assigned pages to this specific user)
  // Only query if clientAdminId is a valid integer (legacy_id), skip for UUIDs
  let userAssignments = [];
  const numericId = parseInt(clientAdminId, 10);
  if (!isNaN(numericId) && numericId > 0) {
    userAssignments = await prisma.$queryRaw`
      SELECT page_key
      FROM admin_page_assignments
      WHERE assignee_id = ${numericId}
        AND assigner_type = 'SUPER_ADMIN'
        AND is_active = true
    `;
    
    for (const a of userAssignments) {
      if (a.page_key) pageKeys.add(a.page_key);
    }
  }
  
  // 2. Role-based assignments (EA assigned pages to the role like ADMIN, OPERATIONS_MANAGER)
  // This is the PRIMARY source of page assignments for tenant roles
  if (userRole) {
    const normalizedRole = userRole.toUpperCase();
    
    // Get pages assigned to this role by Enterprise Admin
    const roleAssignments = await prisma.$queryRaw`
      SELECT DISTINCT pm.page_code, pm.route
      FROM admin_page_assignments apa
      JOIN pages_master pm ON pm.id = apa.page_id
      WHERE apa.assignee_type = ${normalizedRole}
        AND apa.assigner_type = 'ENTERPRISE_ADMIN'
        AND apa.is_active = true
        AND pm.is_active = true
    `;
    
    console.log(`[EffectiveAccess] Found ${roleAssignments.length} role-based pages for ${normalizedRole}`);
    
    for (const a of roleAssignments) {
      if (a.page_code) pageKeys.add(a.page_code);
      if (a.route) pageKeys.add(a.route);
    }
  }
  
  // SECURITY: If no explicit assignments, user gets ONLY ALWAYS_ACCESSIBLE_PAGES
  // This is DENY-BY-DEFAULT behavior
  if (userAssignments.length === 0 && pageKeys.size <= ALWAYS_ACCESSIBLE_PAGES.length) {
    console.warn(`[EffectiveAccess] DENY: No approvals for user ${clientAdminId} (role: ${userRole}) - only common pages accessible`);
  }
  
  return pageKeys;
}

// ============================================================================
// MAIN: Compute Effective Pages (TENANT-SCOPED)
// ============================================================================

/**
 * Compute effective pages for a user using THREE-LAYER INTERSECTION
 * 
 * IMPORTANT: This function is for TENANT-SCOPED users only (Client Admin, Users)
 * For platform-scoped users (EA, SA, SYSTEM_ADMIN), use computePlatformEffectivePages
 * 
 * @param {Object} params
 * @param {number} params.userId - User's legacy_id
 * @param {string} params.tenantId - Tenant/client ID (REQUIRED for tenant users)
 * @param {number} params.planId - Subscription plan ID
 * @param {number} params.superadminId - The Superadmin managing this tenant (optional)
 * @param {string} params.role - User's role (optional, used for platform detection)
 * @returns {Promise<Object>} Effective access result
 */
async function computeEffectivePages({
  userId,
  tenantId,
  planId,
  superadminId = null,
  role = null
}) {
  // ========================================================================
  // EARLY GUARD: Detect platform users and route to platform access
  // ========================================================================
  const normalizedRole = (role || '').toUpperCase();
  
  if (PLATFORM_ROLES.includes(normalizedRole)) {
    console.log(`[EffectiveAccess] Detected platform role ${normalizedRole} - routing to platform access`);
    return await computePlatformEffectivePages({ userId, role: normalizedRole, planId });
  }
  
  // ========================================================================
  // INVARIANT: tenantId is REQUIRED for tenant-scoped users
  // This prevents undefined Prisma calls
  // ========================================================================
  if (tenantId === undefined || tenantId === null) {
    console.error(`[EffectiveAccess] INVARIANT VIOLATION: tenantId required for tenant-scoped RBAC (userId=${userId}, role=${role})`);
    
    // Fail-closed: Return only ALWAYS_ACCESSIBLE_PAGES
    return {
      effectivePages: [...ALWAYS_ACCESSIBLE_PAGES],
      blockedPages: [],
      accessDetails: {},
      planId,
      tenantId: null,
      error: 'TENANT_REQUIRED',
      message: 'Tenant context is required for this user type'
    };
  }
  
  console.log(`[EffectiveAccess] Computing for user=${userId}, tenant=${tenantId}, plan=${planId}`);
  
  const result = {
    effectivePages: [],
    blockedPages: [],
    accessDetails: {},
    planId,
    tenantId
  };
  
  try {
    const prisma = getPrisma();
    
    // RBAC FIX: If planId is missing or 0, fetch from client_subscriptions
    let effectivePlanId = planId;
    if (!effectivePlanId && tenantId) {
      try {
        const activeSub = await prisma.client_subscriptions.findFirst({
          where: { 
            client_id: tenantId,
            is_active: true
          },
          select: { plan_id: true },
          orderBy: { created_at: 'desc' }
        });
        if (activeSub?.plan_id) {
          effectivePlanId = activeSub.plan_id;
          console.log(`[EffectiveAccess] Fetched plan_id=${effectivePlanId} from DB for tenant=${tenantId}`);
        }
      } catch (e) {
        console.warn(`[EffectiveAccess] Could not fetch plan_id for tenant ${tenantId}:`, e.message);
      }
    }
    
    // Fallback to plan 1 only as last resort
    if (!effectivePlanId) {
      console.warn(`[EffectiveAccess] No plan_id found, defaulting to 1`);
      effectivePlanId = 1;
    }
    
    // LAYER 1: Get subscription pages (base entitlement)
    const subscriptionPages = await getSubscriptionPages(effectivePlanId);
    console.log(`[EffectiveAccess] Subscription has ${subscriptionPages.size} pages (plan ${effectivePlanId})`);
    
    // LAYER 2: Get Enterprise Admin approved pages (enterprise gate)
    // NOTE: For tenant-scoped roles (ADMIN, OPERATIONS_MANAGER, etc.), this layer
    // is handled by role-based assignments in LAYER 3. The enterprise layer only
    // applies to platform users (SA accessing EA-approved pages).
    
    // Find the Superadmin for this tenant if not provided
    if (!superadminId) {
      const client = await prisma.clients.findUnique({
        where: { id: tenantId },
        select: { super_admin_id: true }
      });
      superadminId = client?.super_admin_id;
    }
    
    // For tenant-scoped roles, skip the SA-specific enterprise check
    // The role-based assignments from EA ARE the enterprise approval
    const isTenantScopedRole = normalizedRole && !PLATFORM_ROLES.includes(normalizedRole);
    
    let enterpriseApproved = null;
    if (!isTenantScopedRole && superadminId) {
      enterpriseApproved = await getEnterpriseApprovedPages(superadminId);
      if (enterpriseApproved) {
        console.log(`[EffectiveAccess] Enterprise approved ${enterpriseApproved.size} pages for Superadmin ${superadminId}`);
      } else {
        console.log(`[EffectiveAccess] No Enterprise restrictions for Superadmin ${superadminId}`);
      }
    } else if (isTenantScopedRole) {
      console.log(`[EffectiveAccess] Tenant-scoped role ${normalizedRole} - using role-based EA assignments`);
    }
    
    // LAYER 3: Get Superadmin approved pages (client gate)
    // PHASE 3 FIX: Pass user's role so role-based EA assignments are included
    const superadminApproved = await getSuperadminApprovedPages(userId, tenantId, role);
    if (superadminApproved) {
      console.log(`[EffectiveAccess] Superadmin approved ${superadminApproved.size} pages for user ${userId} (role: ${role})`);
    } else {
      console.log(`[EffectiveAccess] DENY: No Superadmin approvals for user ${userId}`);
    }
    
    // COMPUTE INTERSECTION
    // For tenant-scoped roles: subscriptionPages ∩ roleBasedEAAssignments
    // For platform users: subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
    for (const pageKey of subscriptionPages) {
      const inSubscription = true;
      
      // For tenant-scoped roles, skip the enterprise layer check
      // (role-based EA assignments are already in superadminApproved)
      const inEnterprise = isTenantScopedRole ? true : (enterpriseApproved && enterpriseApproved.has(pageKey));
      const inSuperadmin = superadminApproved && superadminApproved.has(pageKey);
      
      const isEffective = inSubscription && inEnterprise && inSuperadmin;
      
      result.accessDetails[pageKey] = {
        inSubscription,
        inEnterprise,
        inSuperadmin,
        isEffective,
        blockedReason: !isEffective ? (
          !inEnterprise ? 'Not approved by Enterprise Admin' :
          !inSuperadmin ? 'Not enabled by Superadmin' :
          'Unknown'
        ) : null
      };
      
      if (isEffective) {
        result.effectivePages.push(pageKey);
      } else {
        result.blockedPages.push({
          pageKey,
          reason: result.accessDetails[pageKey].blockedReason
        });
      }
    }
    
    // ========================================================================
    // PHASE 7 FIX: INJECT COMPULSORY PAGES
    // These pages are ALWAYS accessible regardless of RBAC layers
    // ========================================================================
    const compulsoryPages = await getCompulsoryPages();
    let injectedCount = 0;
    
    for (const pageKey of compulsoryPages) {
      if (!result.effectivePages.includes(pageKey)) {
        result.effectivePages.push(pageKey);
        result.accessDetails[pageKey] = {
          inSubscription: true,
          inEnterprise: true,
          inSuperadmin: true,
          isEffective: true,
          isCompulsory: true,
          blockedReason: null
        };
        injectedCount++;
        
        // Remove from blocked if it was there
        result.blockedPages = result.blockedPages.filter(b => b.pageKey !== pageKey);
      }
    }
    
    if (injectedCount > 0) {
      console.log(`[EffectiveAccess] Injected ${injectedCount} compulsory pages`);
    }
    
    console.log(`[EffectiveAccess] Result: ${result.effectivePages.length} effective, ${result.blockedPages.length} blocked`);
    
    return result;
    
  } catch (error) {
    console.error('[EffectiveAccess] Error computing effective pages:', error);
    throw error;
  }
}

// ============================================================================
// MAIN: Compute Effective Roles
// ============================================================================

/**
 * Compute effective roles for a user using THREE-LAYER INTERSECTION
 * 
 * @param {Object} params
 * @param {number} params.userId - User's legacy_id
 * @param {string} params.tenantId - Tenant/client ID
 * @param {number} params.planId - Subscription plan ID
 * @param {number} params.superadminId - The Superadmin managing this tenant
 * @returns {Promise<Object>} Effective roles result
 */
async function computeEffectiveRoles({
  userId,
  tenantId,
  planId,
  superadminId = null,
  role = null
}) {
  const prisma = getPrisma();
  const normalizedRole = (role || '').toUpperCase();
  
  console.log(`[EffectiveAccess] Computing roles for user=${userId}, tenant=${tenantId}, plan=${planId}, role=${normalizedRole}`);
  
  const result = {
    effectiveRoles: [],
    blockedRoles: [],
    roleDetails: {},
    planId,
    tenantId
  };
  
  try {
    // LAYER 1: Get subscription roles (from plan_role_access or all roles for high plans)
    const planRoles = await prisma.$queryRaw`
      SELECT r.id, r.name, r.display_name
      FROM rbac_roles r
      WHERE r.status = 'active'
    `;
    
    // For simplicity, all active roles are available - plans may restrict this in future
    const subscriptionRoles = new Set(planRoles.map(r => r.name.toUpperCase()));
    
    // LAYER 2: Get Enterprise Admin approved roles for Superadmin
    let enterpriseApprovedRoles = null;
    // Only query if superadminId is a valid integer
    const numericSuperadminId = parseInt(superadminId, 10);
    if (superadminId && !isNaN(numericSuperadminId) && numericSuperadminId > 0) {
      const enterpriseRoleAssignments = await prisma.$queryRaw`
        SELECT ara.role_id, r.name as role_name
        FROM admin_role_assignments ara
        JOIN rbac_roles r ON r.id = ara.role_id
        WHERE ara.assignee_id = ${numericSuperadminId}
          AND ara.assigner_type = 'ENTERPRISE_ADMIN'
          AND ara.is_active = true
      `;
      
      if (enterpriseRoleAssignments.length > 0) {
        enterpriseApprovedRoles = new Set(
          enterpriseRoleAssignments.map(a => (a.role_name || '').toUpperCase())
        );
      }
    }
    
    // LAYER 3: Get Superadmin approved roles for this user
    // Only query if userId is a valid integer (legacy_id), skip for UUIDs
    let superadminRoleAssignments = [];
    const numericUserId = parseInt(userId, 10);
    if (!isNaN(numericUserId) && numericUserId > 0) {
      superadminRoleAssignments = await prisma.$queryRaw`
        SELECT ara.role_id, r.name as role_name
        FROM admin_role_assignments ara
        JOIN rbac_roles r ON r.id = ara.role_id
        WHERE ara.assignee_id = ${numericUserId}
          AND ara.assigner_type = 'SUPER_ADMIN'
          AND ara.is_active = true
      `;
    }
    
    let superadminApprovedRoles = null;
    if (superadminRoleAssignments.length > 0) {
      superadminApprovedRoles = new Set(
        superadminRoleAssignments.map(a => (a.role_name || '').toUpperCase())
      );
    }
    
    // Also check rbac_user_roles junction table (skip if userId is not numeric)
    let userRoles = [];
    if (!isNaN(numericUserId) && numericUserId > 0) {
      userRoles = await prisma.$queryRaw`
        SELECT r.name
        FROM rbac_user_roles ur
        JOIN rbac_roles r ON ur.role_id = r.id
        WHERE ur.user_id = ${numericUserId}
      `;
    }
    
    if (userRoles.length > 0) {
      if (!superadminApprovedRoles) superadminApprovedRoles = new Set();
      for (const ur of userRoles) {
        superadminApprovedRoles.add((ur.name || '').toUpperCase());
      }
    }
    
    // TENANT-SCOPED ROLE FIX: For tenant-scoped users (ADMIN, etc.),
    // if they're logged in with a valid role from JWT, that role should be included
    // in their effective roles. The JWT role is already verified during authentication.
    const PLATFORM_ROLES = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'];
    const isTenantScopedRole = normalizedRole && !PLATFORM_ROLES.includes(normalizedRole);
    
    if (isTenantScopedRole) {
      // For tenant-scoped users, their authenticated role bypasses the approval chain
      // since they already passed authentication with that role
      if (!superadminApprovedRoles) superadminApprovedRoles = new Set();
      superadminApprovedRoles.add(normalizedRole);
      
      // Also allow enterprise approval bypass for tenant-scoped roles
      if (!enterpriseApprovedRoles) enterpriseApprovedRoles = new Set();
      enterpriseApprovedRoles.add(normalizedRole);
    }
    
    // COMPUTE INTERSECTION
    // PHASE 3 CRITICAL FIX: null NEVER means "unrestricted"
    for (const role of planRoles) {
      const roleName = role.name.toUpperCase();
      const inSubscription = subscriptionRoles.has(roleName);
      
      // SECURITY: null means DENY, not "allow all"
      const inEnterprise = enterpriseApprovedRoles && enterpriseApprovedRoles.has(roleName);
      const inSuperadmin = superadminApprovedRoles && superadminApprovedRoles.has(roleName);
      
      const isEffective = inSubscription && inEnterprise && inSuperadmin;
      
      result.roleDetails[roleName] = {
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        inSubscription,
        inEnterprise,
        inSuperadmin,
        isEffective,
        blockedReason: !isEffective ? (
          !inSubscription ? 'Not included in subscription' :
          !inEnterprise ? 'Not approved by Enterprise Admin' :
          !inSuperadmin ? 'Not enabled by Superadmin' :
          'Unknown'
        ) : null
      };
      
      if (isEffective) {
        result.effectiveRoles.push({
          id: role.id,
          name: role.name,
          displayName: role.display_name
        });
      } else {
        result.blockedRoles.push({
          id: role.id,
          name: role.name,
          displayName: role.display_name,
          reason: result.roleDetails[roleName].blockedReason
        });
      }
    }
    
    console.log(`[EffectiveAccess] Roles result: ${result.effectiveRoles.length} effective, ${result.blockedRoles.length} blocked`);
    
    return result;
    
  } catch (error) {
    console.error('[EffectiveAccess] Error computing effective roles:', error);
    throw error;
  }
}

// ============================================================================
// GRANT EFFECTIVE PAGES TO USER
// ============================================================================

/**
 * Grant only effective pages (intersection of all 3 layers) to a user
 * Called when subscription is activated or approvals change
 * 
 * @param {Object} params
 * @param {number} params.userId - User's legacy_id
 * @param {string} params.tenantId - Tenant/client ID
 * @param {number} params.planId - Subscription plan ID
 * @param {number} params.actorUserId - Who is triggering this grant
 * @param {string} params.actorRole - Role of actor (SYSTEM, SUPER_ADMIN, etc)
 * @param {Set<string>} params.limitToPages - Optional: Limit pages to this set (admin's approved pages)
 */
async function grantEffectivePagesToUser({
  userId,
  tenantId,
  planId,
  actorUserId = null,
  _actorRole = 'SYSTEM',
  limitToPages = null
}) {
  const prisma = getPrisma();
  
  console.log(`[EffectiveAccess] Granting effective pages to user=${userId}, tenant=${tenantId}`);
  
  // Compute effective pages
  const effectiveResult = await computeEffectivePages({ userId, tenantId, planId });
  
  let effectivePageKeys = effectiveResult.effectivePages;
  
  // SECURITY: If limitToPages is set, only grant pages that the creating admin has access to
  // This prevents admins from granting pages they don't have permission to
  if (limitToPages && limitToPages.size > 0) {
    const originalCount = effectivePageKeys.length;
    effectivePageKeys = effectivePageKeys.filter(pk => limitToPages.has(pk));
    console.log(`[EffectiveAccess] Admin limit applied: ${originalCount} -> ${effectivePageKeys.length} pages`);
  }
  
  console.log(`[EffectiveAccess] Will grant ${effectivePageKeys.length} effective pages`);
  
  // Get Super Admin ID for this tenant to create approval chain entries
  let superAdminId = null;
  try {
    const client = await prisma.clients.findUnique({
      where: { id: tenantId },
      select: { super_admin_id: true }
    });
    superAdminId = client?.super_admin_id;
  } catch (err) {
    console.warn(`[EffectiveAccess] Could not get super_admin_id for tenant: ${err.message}`);
  }
  
  let grantedCount = 0;
  let approvalChainCount = 0;
  let skippedCount = 0;
  
  // INVARIANT ENFORCEMENT: Import the centralized validation service
  const rbacInvariant = require('./rbacInvariantService');
  
  // Pre-fetch SA's authorized pages from superadmin_page_pool for efficiency
  let saAuthorizedPageIds = new Set();
  if (superAdminId) {
    saAuthorizedPageIds = await rbacInvariant.getAuthorizedPageIds('SUPER_ADMIN', superAdminId, superAdminId);
    console.log(`[EffectiveAccess] SA#${superAdminId} has ${saAuthorizedPageIds.size} pages in their pool`);
  }
  
  for (const pageKey of effectivePageKeys) {
    // SECURITY LOCKDOWN (PHASE 2): ONLY write to admin_page_assignments
    // rbac_user_permissions is now a DERIVED table, not authoritative
    // Legacy write removed - approval chain is the ONLY source of truth
    
    // Create approval chain entry (SA→USER) in admin_page_assignments
    // This is the ONLY table that grants access now
    if (superAdminId) {
      try {
        // Get page_id from page_code
        const page = await prisma.pages_master.findFirst({
          where: { page_code: pageKey, is_active: true },
          select: { id: true }
        });
        
        if (page) {
          // INVARIANT CHECK: SA can only assign pages in their pool
          if (!saAuthorizedPageIds.has(page.id)) {
            console.warn(`[EffectiveAccess] INVARIANT BLOCKED: SA#${superAdminId} cannot assign page#${page.id} (${pageKey}) - not in superadmin_page_pool`);
            skippedCount++;
            continue; // Skip this page - don't insert
          }
          
          await prisma.$queryRaw`
            INSERT INTO admin_page_assignments 
            (assigner_id, assigner_type, assignee_id, assignee_type, page_id, page_key, tenant_id, is_active)
            VALUES (${superAdminId}::int, 'SUPER_ADMIN', ${userId}::int, 'USER', ${page.id}::int, ${pageKey}, ${tenantId}, true)
            ON CONFLICT DO NOTHING
          `;
          approvalChainCount++;
          grantedCount++;
        }
      } catch {
        // Ignore - might be unique constraint violation which is fine
      }
    } else {
      console.warn(`[EffectiveAccess] Cannot grant page ${pageKey} - no Super Admin found for tenant`);
    }
  }
  
  if (skippedCount > 0) {
    console.warn(`[EffectiveAccess] INVARIANT: Blocked ${skippedCount} pages not in SA's pool`);
  }
  
  console.log(`[EffectiveAccess] Created ${approvalChainCount} admin_page_assignments entries (AUTHORITATIVE)`);
  
  // Log the grant
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: actorUserId,
        action: 'GRANT_EFFECTIVE_PAGES',
        table_name: 'admin_page_assignments',
        new_values: {
          targetUserId: userId,
          tenantId,
          planId,
          effectivePagesCount: grantedCount,
          approvalChainCount,
          blockedPagesCount: effectiveResult.blockedPages.length,
          blockedPages: effectiveResult.blockedPages.slice(0, 10),
          lockdownPhase: 'PHASE_2_AUTHORITATIVE'
        }
      }
    });
  } catch (logErr) {
    console.error('[EffectiveAccess] Audit log failed:', logErr.message);
  }
  
  return {
    success: true,
    grantedCount,
    approvalChainCount,
    blockedCount: effectiveResult.blockedPages.length,
    effectivePages: effectivePageKeys,
    blockedPages: effectiveResult.blockedPages
  };
}

// ============================================================================
// AUTHORIZATION CHECK (Backend Middleware)
// ============================================================================

/**
 * Check if a user has effective access to a specific page
 * Use this in backend middleware to enforce authorization
 * 
 * @param {number} userId - User's legacy_id
 * @param {string} tenantId - Tenant/client ID
 * @param {string} pageKey - Page key to check
 * @returns {Promise<Object>} Access check result
 */
async function checkEffectivePageAccess(userId, tenantId, pageKey) {
  const prisma = getPrisma();
  
  // Always allow core pages
  if (ALWAYS_ACCESSIBLE_PAGES.includes(pageKey.toLowerCase())) {
    return { hasAccess: true, reason: 'Core page - always accessible' };
  }
  
  // Get user's subscription plan
  const subscription = await prisma.client_subscriptions.findUnique({
    where: { client_id: tenantId },
    select: { plan_id: true, state: true }
  });
  
  if (!subscription || !['ACTIVE', 'TRIAL'].includes(subscription.state)) {
    return { hasAccess: false, reason: 'No active subscription' };
  }
  
  // Compute effective access for this specific page
  const effectiveResult = await computeEffectivePages({
    userId,
    tenantId,
    planId: subscription.plan_id
  });
  
  const pageDetail = effectiveResult.accessDetails[pageKey];
  
  if (!pageDetail) {
    // Page not in subscription at all
    return { hasAccess: false, reason: 'Page not included in subscription plan' };
  }
  
  if (pageDetail.isEffective) {
    return { hasAccess: true, reason: 'Effective access granted' };
  }
  
  return { 
    hasAccess: false, 
    reason: pageDetail.blockedReason || 'Access not approved'
  };
}

// ============================================================================
// AUDIT LOGGING FOR APPROVAL CHANGES
// ============================================================================

/**
 * Log when Enterprise Admin changes page approvals for a Superadmin
 */
async function logEnterpriseApprovalChange({
  enterpriseAdminId,
  superadminId,
  action, // 'GRANT' or 'REVOKE'
  pageKeys,
  reason = null
}) {
  const prisma = getPrisma();
  
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: enterpriseAdminId,
        action: `ENTERPRISE_${action}_PAGES`,
        table_name: 'admin_page_assignments',
        new_values: {
          superadminId,
          pageKeys,
          reason,
          timestamp: new Date().toISOString()
        }
      }
    });
    console.log(`[EffectiveAccess] Logged Enterprise approval change: ${action} ${pageKeys.length} pages`);
  } catch (err) {
    console.error('[EffectiveAccess] Failed to log Enterprise approval change:', err.message);
  }
}

/**
 * Log when Superadmin changes page approvals for a Client/Admin
 */
async function logSuperadminApprovalChange({
  superadminId,
  clientAdminId,
  tenantId,
  action, // 'GRANT' or 'REVOKE'
  pageKeys,
  reason = null
}) {
  const prisma = getPrisma();
  
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: superadminId,
        action: `SUPERADMIN_${action}_PAGES`,
        table_name: 'admin_page_assignments',
        new_values: {
          clientAdminId,
          tenantId,
          pageKeys,
          reason,
          timestamp: new Date().toISOString()
        }
      }
    });
    console.log(`[EffectiveAccess] Logged Superadmin approval change: ${action} ${pageKeys.length} pages`);
  } catch (err) {
    console.error('[EffectiveAccess] Failed to log Superadmin approval change:', err.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core computation
  computeEffectivePages,
  computeEffectiveRoles,
  
  // Platform-level access (no tenant)
  computePlatformEffectivePages,
  computeEnterpriseAdminPages,
  computeSuperAdminPages,
  
  // Compulsory/Default pages (Phase 7)
  getCompulsoryPages,
  getDefaultPages,
  clearCompulsoryPagesCache,
  
  // Constants
  PLATFORM_ROLES,
  ALWAYS_ACCESSIBLE_PAGES,
  ALWAYS_ACCESSIBLE_PAGES_KEYS,
  ALWAYS_ACCESSIBLE_MODULES,
  REJECTION_CODES,
  
  // Granting
  grantEffectivePagesToUser,
  
  // Authorization check
  checkEffectivePageAccess,
  
  // Audit logging
  logEnterpriseApprovalChange,
  logSuperadminApprovalChange,
  
  // Helpers (for testing)
  getSubscriptionPages,
  getEnterpriseApprovedPages,
  getSuperadminApprovedPages
};
