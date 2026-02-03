/**
 * RBAC INVARIANT ENFORCEMENT SERVICE
 * ===================================
 * 
 * INVARIANT: admin_page_assignments must NEVER contain a row where the 
 * assigner lacks upstream authority over the page.
 * 
 * HIERARCHY:
 *   ENTERPRISE_ADMIN → can assign ANY page (manufacturer)
 *   SUPER_ADMIN      → can ONLY assign pages from superadmin_page_pool
 *   ADMIN            → can ONLY assign pages from their own admin_page_assignments
 * 
 * This service provides centralized validation that MUST be called 
 * before ANY INSERT into admin_page_assignments.
 * 
 * FAIL HARD: Throws error or returns 403 - NO SILENT FILTERING
 */

const { getPrisma } = require('../lib/prisma');

/**
 * Validates that an assigner has authority to assign a specific page.
 * 
 * @param {Object} params
 * @param {string} params.assignerType - 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', or 'ADMIN'
 * @param {number} params.assignerId - The ID of the user doing the assignment
 * @param {number} params.pageId - The page ID being assigned
 * @param {string} params.pageKey - The page_code being assigned (for logging)
 * @param {number} [params.superAdminId] - Required if assignerType is 'SUPER_ADMIN'
 * @returns {Promise<{valid: boolean, reason?: string}>}
 * @throws {Error} If database query fails
 */
async function assertAssignerHasAuthority({ assignerType, assignerId, pageId, pageKey, superAdminId }) {
  const prisma = getPrisma();
  
  // Input validation
  if (!assignerType || !assignerId || !pageId) {
    return {
      valid: false,
      reason: `INVARIANT_VIOLATION: Missing required params - assignerType:${assignerType}, assignerId:${assignerId}, pageId:${pageId}`
    };
  }

  // ENTERPRISE_ADMIN has unrestricted authority (manufacturer)
  if (assignerType === 'ENTERPRISE_ADMIN') {
    return { valid: true };
  }

  // SUPER_ADMIN must have page in their superadmin_page_pool (granted by EA)
  if (assignerType === 'SUPER_ADMIN') {
    const saId = superAdminId || assignerId;
    
    const poolEntry = await prisma.$queryRaw`
      SELECT 1 FROM superadmin_page_pool
      WHERE superadmin_id = ${parseInt(saId)}
        AND page_id = ${parseInt(pageId)}
        AND is_active = true
      LIMIT 1
    `;

    if (!poolEntry || poolEntry.length === 0) {
      return {
        valid: false,
        reason: `INVARIANT_VIOLATION: SUPER_ADMIN#${saId} cannot assign page#${pageId} (${pageKey}) - not in their superadmin_page_pool. EA must grant first.`
      };
    }

    return { valid: true };
  }

  // ADMIN must have page in their own admin_page_assignments
  if (assignerType === 'ADMIN') {
    const adminAssignment = await prisma.$queryRaw`
      SELECT 1 FROM admin_page_assignments
      WHERE assignee_type = 'ADMIN'
        AND page_id = ${parseInt(pageId)}
        AND is_active = true
      LIMIT 1
    `;

    if (!adminAssignment || adminAssignment.length === 0) {
      return {
        valid: false,
        reason: `INVARIANT_VIOLATION: ADMIN cannot assign page#${pageId} (${pageKey}) - not assigned to ADMIN role. SA must grant first.`
      };
    }

    return { valid: true };
  }

  // Unknown assigner type - fail closed
  return {
    valid: false,
    reason: `INVARIANT_VIOLATION: Unknown assigner_type '${assignerType}' cannot assign pages`
  };
}

/**
 * Validates multiple pages at once for batch operations.
 * Returns list of valid pages and list of rejected pages with reasons.
 * 
 * @param {Object} params
 * @param {string} params.assignerType - 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', or 'ADMIN'
 * @param {number} params.assignerId - The ID of the user doing the assignment
 * @param {Array<{id: number, page_code: string}>} params.pages - Pages to validate
 * @param {number} [params.superAdminId] - Required if assignerType is 'SUPER_ADMIN'
 * @returns {Promise<{validPages: Array, rejectedPages: Array<{page: Object, reason: string}>}>}
 */
async function assertBatchAuthority({ assignerType, assignerId, pages, superAdminId }) {
  const prisma = getPrisma();
  
  // ENTERPRISE_ADMIN - all pages valid
  if (assignerType === 'ENTERPRISE_ADMIN') {
    return { validPages: pages, rejectedPages: [] };
  }

  const validPages = [];
  const rejectedPages = [];

  // For efficiency, get all allowed pages in one query
  let allowedPageIds = new Set();

  if (assignerType === 'SUPER_ADMIN') {
    const saId = superAdminId || assignerId;
    const poolPages = await prisma.$queryRaw`
      SELECT page_id FROM superadmin_page_pool
      WHERE superadmin_id = ${parseInt(saId)}
        AND is_active = true
    `;
    allowedPageIds = new Set(poolPages.map(p => p.page_id));
  } else if (assignerType === 'ADMIN') {
    const adminPages = await prisma.$queryRaw`
      SELECT page_id FROM admin_page_assignments
      WHERE assignee_type = 'ADMIN'
        AND is_active = true
    `;
    allowedPageIds = new Set(adminPages.map(p => p.page_id));
  } else {
    // Unknown type - reject all
    for (const page of pages) {
      rejectedPages.push({
        page,
        reason: `INVARIANT_VIOLATION: Unknown assigner_type '${assignerType}' cannot assign pages`
      });
    }
    return { validPages: [], rejectedPages };
  }

  // Validate each page
  for (const page of pages) {
    if (allowedPageIds.has(page.id)) {
      validPages.push(page);
    } else {
      rejectedPages.push({
        page,
        reason: `INVARIANT_VIOLATION: ${assignerType}#${assignerId} cannot assign page#${page.id} (${page.page_code}) - not in their authority scope`
      });
    }
  }

  return { validPages, rejectedPages };
}

/**
 * Hard validation with 403 response helper.
 * Call this and return early if validation fails.
 * 
 * @param {Object} params - Same as assertAssignerHasAuthority
 * @returns {Promise<{pass: true}|{pass: false, statusCode: number, error: Object}>}
 */
async function validateOrReject(params) {
  const result = await assertAssignerHasAuthority(params);
  
  if (!result.valid) {
    console.error('[RBAC-INVARIANT]', result.reason);
    return {
      pass: false,
      statusCode: 403,
      error: {
        success: false,
        error: 'RBAC_INVARIANT_VIOLATION',
        message: result.reason,
        details: {
          assignerType: params.assignerType,
          assignerId: params.assignerId,
          pageId: params.pageId,
          pageKey: params.pageKey
        }
      }
    };
  }

  return { pass: true };
}

/**
 * Hard validation for batch operations.
 * FAILS HARD if ANY page is unauthorized - no partial success.
 * 
 * @param {Object} params - Same as assertBatchAuthority
 * @param {boolean} [allowPartial=false] - If true, returns only valid pages. If false, fails on any rejection.
 * @returns {Promise<{pass: true, validPages: Array}|{pass: false, statusCode: number, error: Object}>}
 */
async function validateBatchOrReject(params, allowPartial = false) {
  const { validPages, rejectedPages } = await assertBatchAuthority(params);

  if (rejectedPages.length > 0 && !allowPartial) {
    const reasons = rejectedPages.map(r => r.reason).join('; ');
    console.error('[RBAC-INVARIANT] Batch validation failed:', reasons);
    return {
      pass: false,
      statusCode: 403,
      error: {
        success: false,
        error: 'RBAC_INVARIANT_VIOLATION',
        message: `Cannot assign ${rejectedPages.length} unauthorized pages`,
        details: {
          assignerType: params.assignerType,
          assignerId: params.assignerId,
          rejectedCount: rejectedPages.length,
          rejectedPages: rejectedPages.map(r => ({ 
            pageId: r.page.id, 
            pageCode: r.page.page_code, 
            reason: r.reason 
          }))
        }
      }
    };
  }

  return { pass: true, validPages, rejectedPages };
}

/**
 * Get all pages authorized for a specific assigner.
 * Useful for UI to show only allowed options.
 * 
 * @param {string} assignerType - 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', or 'ADMIN'
 * @param {number} assignerId - The ID of the assigner
 * @param {number} [superAdminId] - Required if assignerType is 'SUPER_ADMIN'
 * @returns {Promise<Set<number>>} Set of authorized page IDs
 */
async function getAuthorizedPageIds(assignerType, assignerId, superAdminId) {
  const prisma = getPrisma();
  
  if (assignerType === 'ENTERPRISE_ADMIN') {
    // EA can assign any active page
    const allPages = await prisma.$queryRaw`
      SELECT id FROM pages_master WHERE is_active = true
    `;
    return new Set(allPages.map(p => p.id));
  }

  if (assignerType === 'SUPER_ADMIN') {
    const saId = superAdminId || assignerId;
    const poolPages = await prisma.$queryRaw`
      SELECT page_id FROM superadmin_page_pool
      WHERE superadmin_id = ${parseInt(saId)}
        AND is_active = true
    `;
    return new Set(poolPages.map(p => p.page_id));
  }

  if (assignerType === 'ADMIN') {
    const adminPages = await prisma.$queryRaw`
      SELECT page_id FROM admin_page_assignments
      WHERE assignee_type = 'ADMIN'
        AND is_active = true
    `;
    return new Set(adminPages.map(p => p.page_id));
  }

  // Unknown type - no authority
  return new Set();
}

module.exports = {
  assertAssignerHasAuthority,
  assertBatchAuthority,
  validateOrReject,
  validateBatchOrReject,
  getAuthorizedPageIds
};
