/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * QA MODULE - Controller
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Business logic for QA/Testing module:
 * - Test Tasks: Assignment management
 * - Issues: Bug tracking with automatic history logging
 * - Dashboard: Stats aggregation
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { getPrisma } = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log a change to issue history
 */
async function logIssueChange(prisma, issueId, changedBy, field, oldValue, newValue, note = null, gitCommit = null, tenantId = null) {
  return prisma.$executeRaw`
    INSERT INTO qa_issue_history (issue_id, changed_by, field, old_value, new_value, note, git_commit, tenant_id, changed_at)
    VALUES (${issueId}, ${changedBy}, ${field}, ${oldValue}, ${newValue}, ${note}, ${gitCommit}, ${tenantId}, NOW())
  `;
}

/**
 * Get fields that changed between old and new issue
 */
function getChangedFields(oldIssue, updates) {
  const trackableFields = ['status', 'severity', 'title', 'description', 'assigned_to', 'module', 'related_screen', 'api_name', 'build_version', 'fix_version'];
  const changes = [];
  
  for (const field of trackableFields) {
    const snakeField = field;
    const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    
    const oldVal = oldIssue[snakeField] ?? oldIssue[camelField];
    const newVal = updates[snakeField] ?? updates[camelField];
    
    if (newVal !== undefined && String(oldVal ?? '') !== String(newVal ?? '')) {
      changes.push({
        field: snakeField,
        oldValue: String(oldVal ?? ''),
        newValue: String(newVal ?? '')
      });
    }
  }
  
  return changes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get dashboard stats for current user
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get my test tasks count by status
    const myTasks = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int as count 
      FROM qa_test_tasks 
      WHERE assigned_to = ${userId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      GROUP BY status
    `;
    
    // Get my open issues (opened by me)
    const myOpenIssues = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM qa_issues 
      WHERE opened_by = ${userId} 
        AND status NOT IN ('Closed', 'Wont-Fix')
        AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
    `;
    
    // Get issues assigned to me
    const assignedToMe = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int as count 
      FROM qa_issues 
      WHERE assigned_to = ${userId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      GROUP BY status
    `;
    
    // Get retest pending (issues I opened that are Ready-for-Retest)
    const retestPending = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM qa_issues 
      WHERE opened_by = ${userId} 
        AND status = 'Ready-for-Retest'
        AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
    `;
    
    res.json({
      myTasks: myTasks.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
      myOpenIssues: myOpenIssues[0]?.count || 0,
      assignedToMe: assignedToMe.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
      retestPending: retestPending[0]?.count || 0
    });
  } catch (error) {
    console.error('[QA] Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

/**
 * Get overall QA summary (for admins)
 */
exports.getSummary = async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.user?.tenantId;
    
    // Total tasks by status
    const tasksByStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int as count 
      FROM qa_test_tasks 
      WHERE tenant_id = ${tenantId} OR tenant_id IS NULL
      GROUP BY status
    `;
    
    // Total issues by status
    const issuesByStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int as count 
      FROM qa_issues 
      WHERE tenant_id = ${tenantId} OR tenant_id IS NULL
      GROUP BY status
    `;
    
    // Issues by severity
    const issuesBySeverity = await prisma.$queryRaw`
      SELECT severity, COUNT(*)::int as count 
      FROM qa_issues 
      WHERE status NOT IN ('Closed', 'Wont-Fix')
        AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      GROUP BY severity
    `;
    
    // Issues by module
    const issuesByModule = await prisma.$queryRaw`
      SELECT module, COUNT(*)::int as count 
      FROM qa_issues 
      WHERE status NOT IN ('Closed', 'Wont-Fix')
        AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      GROUP BY module
    `;
    
    // Recent activity (last 10 changes)
    const recentActivity = await prisma.$queryRaw`
      SELECT h.*, i.code as issue_code, i.title as issue_title,
             u.name as changed_by_name
      FROM qa_issue_history h
      LEFT JOIN qa_issues i ON h.issue_id = i.id
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.tenant_id = ${tenantId} OR h.tenant_id IS NULL
      ORDER BY h.changed_at DESC
      LIMIT 10
    `;
    
    res.json({
      tasksByStatus: tasksByStatus.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
      issuesByStatus: issuesByStatus.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
      issuesBySeverity: issuesBySeverity.reduce((acc, row) => ({ ...acc, [row.severity]: row.count }), {}),
      issuesByModule: issuesByModule.reduce((acc, row) => ({ ...acc, [row.module || 'Unknown']: row.count }), {}),
      recentActivity
    });
  } catch (error) {
    console.error('[QA] Summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST TASKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all test tasks with filters
 */
exports.getTestTasks = async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.user?.tenantId;
    const { status, priority, module, assigned_to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = `WHERE (t.tenant_id = ${tenantId} OR t.tenant_id IS NULL)`;
    if (status) whereClause += ` AND t.status = '${status}'`;
    if (priority) whereClause += ` AND t.priority = '${priority}'`;
    if (module) whereClause += ` AND t.module = '${module}'`;
    if (assigned_to) whereClause += ` AND t.assigned_to = ${parseInt(assigned_to)}`;
    
    const tasks = await prisma.$queryRawUnsafe(`
      SELECT t.*, 
             u1.name as assigned_to_name, u1.email as assigned_to_email,
             u2.name as created_by_name,
             (SELECT COUNT(*)::int FROM qa_issues WHERE task_id = t.id) as issue_count
      FROM qa_test_tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      ${whereClause}
      ORDER BY 
        CASE t.priority 
          WHEN 'Critical' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Medium' THEN 3 
          ELSE 4 
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);
    
    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as total FROM qa_test_tasks t ${whereClause}
    `);
    
    res.json({
      tasks,
      total: countResult[0]?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('[QA] Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch test tasks' });
  }
};

/**
 * Get tasks assigned to current user
 */
exports.getMyTestTasks = async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    const tasks = await prisma.$queryRaw`
      SELECT t.*, 
             u2.name as created_by_name,
             (SELECT COUNT(*)::int FROM qa_issues WHERE task_id = t.id) as issue_count
      FROM qa_test_tasks t
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.assigned_to = ${userId} 
        AND (t.tenant_id = ${tenantId} OR t.tenant_id IS NULL)
      ORDER BY 
        CASE t.status WHEN 'In Progress' THEN 1 WHEN 'Open' THEN 2 ELSE 3 END,
        CASE t.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
        t.due_date ASC NULLS LAST
    `;
    
    res.json({ tasks });
  } catch (error) {
    console.error('[QA] Get my tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch your tasks' });
  }
};

/**
 * Get single test task by ID
 */
exports.getTestTaskById = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    const tasks = await prisma.$queryRaw`
      SELECT t.*, 
             u1.name as assigned_to_name, u1.email as assigned_to_email,
             u2.name as created_by_name
      FROM qa_test_tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.id = ${parseInt(id)} AND (t.tenant_id = ${tenantId} OR t.tenant_id IS NULL)
    `;
    
    if (!tasks.length) {
      return res.status(404).json({ error: 'Test task not found' });
    }
    
    // Get related issues
    const issues = await prisma.$queryRaw`
      SELECT id, code, title, severity, status, opened_at
      FROM qa_issues
      WHERE task_id = ${parseInt(id)}
      ORDER BY opened_at DESC
    `;
    
    res.json({ task: tasks[0], issues });
  } catch (error) {
    console.error('[QA] Get task by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch test task' });
  }
};

/**
 * Create a new test task
 */
exports.createTestTask = async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { title, description, module, related_screen, build_version, priority, assigned_to, status, due_date, notes } = req.body;
    
    if (!title || !module) {
      return res.status(400).json({ error: 'Title and module are required' });
    }
    
    const result = await prisma.$queryRaw`
      INSERT INTO qa_test_tasks 
        (title, description, module, related_screen, build_version, priority, assigned_to, status, due_date, notes, created_by, tenant_id)
      VALUES 
        (${title}, ${description || null}, ${module}, ${related_screen || null}, ${build_version || null}, 
         ${priority || 'Medium'}, ${assigned_to ? parseInt(assigned_to) : null}, ${status || 'Open'}, 
         ${due_date ? new Date(due_date) : null}, ${notes || null}, ${userId}, ${tenantId})
      RETURNING *
    `;
    
    res.status(201).json({ task: result[0], message: 'Test task created successfully' });
  } catch (error) {
    console.error('[QA] Create task error:', error);
    res.status(500).json({ error: 'Failed to create test task' });
  }
};

/**
 * Update a test task
 */
exports.updateTestTask = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { title, description, module, related_screen, build_version, priority, assigned_to, status, due_date, notes } = req.body;
    
    const result = await prisma.$queryRaw`
      UPDATE qa_test_tasks SET
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        module = COALESCE(${module}, module),
        related_screen = COALESCE(${related_screen}, related_screen),
        build_version = COALESCE(${build_version}, build_version),
        priority = COALESCE(${priority}, priority),
        assigned_to = COALESCE(${assigned_to ? parseInt(assigned_to) : null}, assigned_to),
        status = COALESCE(${status}, status),
        due_date = COALESCE(${due_date ? new Date(due_date) : null}, due_date),
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${parseInt(id)} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      RETURNING *
    `;
    
    if (!result.length) {
      return res.status(404).json({ error: 'Test task not found' });
    }
    
    res.json({ task: result[0], message: 'Test task updated successfully' });
  } catch (error) {
    console.error('[QA] Update task error:', error);
    res.status(500).json({ error: 'Failed to update test task' });
  }
};

/**
 * Delete a test task
 */
exports.deleteTestTask = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    const result = await prisma.$queryRaw`
      DELETE FROM qa_test_tasks 
      WHERE id = ${parseInt(id)} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      RETURNING id
    `;
    
    if (!result.length) {
      return res.status(404).json({ error: 'Test task not found' });
    }
    
    res.json({ message: 'Test task deleted successfully' });
  } catch (error) {
    console.error('[QA] Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete test task' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ISSUES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all issues with filters
 */
exports.getIssues = async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.user?.tenantId;
    const { status, severity, module, assigned_to, opened_by, task_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = `WHERE (i.tenant_id = ${tenantId} OR i.tenant_id IS NULL)`;
    if (status) whereClause += ` AND i.status = '${status}'`;
    if (severity) whereClause += ` AND i.severity = '${severity}'`;
    if (module) whereClause += ` AND i.module = '${module}'`;
    if (assigned_to) whereClause += ` AND i.assigned_to = ${parseInt(assigned_to)}`;
    if (opened_by) whereClause += ` AND i.opened_by = ${parseInt(opened_by)}`;
    if (task_id) whereClause += ` AND i.task_id = ${parseInt(task_id)}`;
    
    const issues = await prisma.$queryRawUnsafe(`
      SELECT i.*, 
             u1.name as opened_by_name, u1.email as opened_by_email,
             u2.name as assigned_to_name, u2.email as assigned_to_email,
             t.title as task_title
      FROM qa_issues i
      LEFT JOIN users u1 ON i.opened_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN qa_test_tasks t ON i.task_id = t.id
      ${whereClause}
      ORDER BY 
        CASE i.severity 
          WHEN 'Critical' THEN 1 
          WHEN 'Major' THEN 2 
          WHEN 'Minor' THEN 3 
          ELSE 4 
        END,
        CASE i.status 
          WHEN 'Open' THEN 1 
          WHEN 'In-Dev' THEN 2 
          WHEN 'Ready-for-Retest' THEN 3 
          ELSE 4 
        END,
        i.opened_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);
    
    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as total FROM qa_issues i ${whereClause}
    `);
    
    res.json({
      issues,
      total: countResult[0]?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('[QA] Get issues error:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
};

/**
 * Get issues opened by current user
 */
exports.getMyIssues = async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    const issues = await prisma.$queryRaw`
      SELECT i.*, 
             u2.name as assigned_to_name,
             t.title as task_title
      FROM qa_issues i
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN qa_test_tasks t ON i.task_id = t.id
      WHERE i.opened_by = ${userId} AND (i.tenant_id = ${tenantId} OR i.tenant_id IS NULL)
      ORDER BY 
        CASE i.status WHEN 'Ready-for-Retest' THEN 1 WHEN 'Open' THEN 2 WHEN 'In-Dev' THEN 3 ELSE 4 END,
        i.opened_at DESC
    `;
    
    res.json({ issues });
  } catch (error) {
    console.error('[QA] Get my issues error:', error);
    res.status(500).json({ error: 'Failed to fetch your issues' });
  }
};

/**
 * Get issues assigned to current user
 */
exports.getIssuesAssignedToMe = async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    const issues = await prisma.$queryRaw`
      SELECT i.*, 
             u1.name as opened_by_name,
             t.title as task_title
      FROM qa_issues i
      LEFT JOIN users u1 ON i.opened_by = u1.id
      LEFT JOIN qa_test_tasks t ON i.task_id = t.id
      WHERE i.assigned_to = ${userId} 
        AND i.status NOT IN ('Closed', 'Wont-Fix')
        AND (i.tenant_id = ${tenantId} OR i.tenant_id IS NULL)
      ORDER BY 
        CASE i.severity WHEN 'Critical' THEN 1 WHEN 'Major' THEN 2 ELSE 3 END,
        i.opened_at DESC
    `;
    
    res.json({ issues });
  } catch (error) {
    console.error('[QA] Get assigned issues error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned issues' });
  }
};

/**
 * Get issues pending retest for current user (tester who opened them)
 */
exports.getRetestPending = async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    const issues = await prisma.$queryRaw`
      SELECT i.*, 
             u2.name as assigned_to_name,
             t.title as task_title
      FROM qa_issues i
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN qa_test_tasks t ON i.task_id = t.id
      WHERE i.opened_by = ${userId} 
        AND i.status = 'Ready-for-Retest'
        AND (i.tenant_id = ${tenantId} OR i.tenant_id IS NULL)
      ORDER BY i.updated_at DESC
    `;
    
    res.json({ issues });
  } catch (error) {
    console.error('[QA] Get retest pending error:', error);
    res.status(500).json({ error: 'Failed to fetch retest pending issues' });
  }
};

/**
 * Get single issue by ID with history
 */
exports.getIssueById = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    const issues = await prisma.$queryRaw`
      SELECT i.*, 
             u1.name as opened_by_name, u1.email as opened_by_email,
             u2.name as assigned_to_name, u2.email as assigned_to_email,
             t.title as task_title, t.module as task_module
      FROM qa_issues i
      LEFT JOIN users u1 ON i.opened_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN qa_test_tasks t ON i.task_id = t.id
      WHERE i.id = ${parseInt(id)} AND (i.tenant_id = ${tenantId} OR i.tenant_id IS NULL)
    `;
    
    if (!issues.length) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    // Get history/timeline
    const history = await prisma.$queryRaw`
      SELECT h.*, u.name as changed_by_name
      FROM qa_issue_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.issue_id = ${parseInt(id)}
      ORDER BY h.changed_at DESC
    `;
    
    res.json({ issue: issues[0], history });
  } catch (error) {
    console.error('[QA] Get issue by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
};

/**
 * Get issue history/timeline
 */
exports.getIssueHistory = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    const history = await prisma.$queryRaw`
      SELECT h.*, u.name as changed_by_name
      FROM qa_issue_history h
      LEFT JOIN users u ON h.changed_by = u.id
      LEFT JOIN qa_issues i ON h.issue_id = i.id
      WHERE h.issue_id = ${parseInt(id)} AND (i.tenant_id = ${tenantId} OR i.tenant_id IS NULL)
      ORDER BY h.changed_at DESC
    `;
    
    res.json({ history });
  } catch (error) {
    console.error('[QA] Get issue history error:', error);
    res.status(500).json({ error: 'Failed to fetch issue history' });
  }
};

/**
 * Create a new issue
 */
exports.createIssue = async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { 
      task_id, title, description, module, related_screen, api_name, 
      severity, status, assigned_to, build_version, tenant_name, 
      browser, os, attachments, steps_to_reproduce, expected_result, actual_result 
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await prisma.$queryRaw`
      INSERT INTO qa_issues 
        (task_id, title, description, module, related_screen, api_name, severity, status, 
         opened_by, assigned_to, build_version, tenant_name, browser, os, attachments,
         steps_to_reproduce, expected_result, actual_result, tenant_id)
      VALUES 
        (${task_id ? parseInt(task_id) : null}, ${title}, ${description || null}, ${module || null}, 
         ${related_screen || null}, ${api_name || null}, ${severity || 'Minor'}, ${status || 'Open'},
         ${userId}, ${assigned_to ? parseInt(assigned_to) : null}, ${build_version || null}, 
         ${tenant_name || null}, ${browser || null}, ${os || null}, 
         ${attachments ? JSON.stringify(attachments) : '[]'}::jsonb,
         ${steps_to_reproduce || null}, ${expected_result || null}, ${actual_result || null}, ${tenantId})
      RETURNING *
    `;
    
    // Log creation in history
    await logIssueChange(prisma, result[0].id, userId, 'created', null, 'Issue created', null, null, tenantId);
    
    res.status(201).json({ issue: result[0], message: 'Issue created successfully' });
  } catch (error) {
    console.error('[QA] Create issue error:', error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
};

/**
 * Update an issue (auto-logs history)
 */
exports.updateIssue = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const updates = req.body;
    const { note, git_commit } = updates;
    
    // Get current issue state
    const currentIssue = await prisma.$queryRaw`
      SELECT * FROM qa_issues WHERE id = ${parseInt(id)} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
    `;
    
    if (!currentIssue.length) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    // Detect changes and log them
    const changes = getChangedFields(currentIssue[0], updates);
    
    // Update the issue
    const result = await prisma.$queryRaw`
      UPDATE qa_issues SET
        title = COALESCE(${updates.title}, title),
        description = COALESCE(${updates.description}, description),
        module = COALESCE(${updates.module}, module),
        related_screen = COALESCE(${updates.related_screen}, related_screen),
        api_name = COALESCE(${updates.api_name}, api_name),
        severity = COALESCE(${updates.severity}, severity),
        status = COALESCE(${updates.status}, status),
        assigned_to = COALESCE(${updates.assigned_to ? parseInt(updates.assigned_to) : null}, assigned_to),
        build_version = COALESCE(${updates.build_version}, build_version),
        fix_version = COALESCE(${updates.fix_version}, fix_version),
        tenant_name = COALESCE(${updates.tenant_name}, tenant_name),
        browser = COALESCE(${updates.browser}, browser),
        os = COALESCE(${updates.os}, os),
        attachments = COALESCE(${updates.attachments ? JSON.stringify(updates.attachments) : null}::jsonb, attachments),
        steps_to_reproduce = COALESCE(${updates.steps_to_reproduce}, steps_to_reproduce),
        expected_result = COALESCE(${updates.expected_result}, expected_result),
        actual_result = COALESCE(${updates.actual_result}, actual_result),
        closed_at = CASE WHEN ${updates.status} IN ('Closed', 'Wont-Fix') THEN NOW() ELSE closed_at END,
        updated_at = NOW()
      WHERE id = ${parseInt(id)} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      RETURNING *
    `;
    
    // Log each change to history
    for (const change of changes) {
      await logIssueChange(prisma, parseInt(id), userId, change.field, change.oldValue, change.newValue, note || null, git_commit || null, tenantId);
    }
    
    // If only note/comment provided (no field changes), log as comment
    if (changes.length === 0 && note) {
      await logIssueChange(prisma, parseInt(id), userId, 'comment', null, null, note, git_commit || null, tenantId);
    }
    
    res.json({ issue: result[0], changes, message: 'Issue updated successfully' });
  } catch (error) {
    console.error('[QA] Update issue error:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
};

/**
 * Add a comment to issue history
 */
exports.addIssueComment = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { note, git_commit } = req.body;
    
    if (!note) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    // Verify issue exists
    const issue = await prisma.$queryRaw`
      SELECT id FROM qa_issues WHERE id = ${parseInt(id)} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
    `;
    
    if (!issue.length) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    await logIssueChange(prisma, parseInt(id), userId, 'comment', null, null, note, git_commit || null, tenantId);
    
    res.json({ message: 'Comment added successfully' });
  } catch (error) {
    console.error('[QA] Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

/**
 * Delete an issue
 */
exports.deleteIssue = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    const result = await prisma.$queryRaw`
      DELETE FROM qa_issues 
      WHERE id = ${parseInt(id)} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      RETURNING id
    `;
    
    if (!result.length) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('[QA] Delete issue error:', error);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUPS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get list of modules for dropdown
 */
exports.getModuleList = async (req, res) => {
  try {
    // Static list based on ERP modules
    const modules = [
      { id: 'sales', name: 'Sales' },
      { id: 'purchase', name: 'Purchase' },
      { id: 'inventory', name: 'Inventory' },
      { id: 'hr', name: 'Human Resources' },
      { id: 'payroll', name: 'Payroll' },
      { id: 'finance', name: 'Finance' },
      { id: 'accounting', name: 'Accounting' },
      { id: 'procurement', name: 'Procurement' },
      { id: 'operations', name: 'Operations' },
      { id: 'compliance', name: 'Compliance' },
      { id: 'system', name: 'System Administration' },
      { id: 'billing', name: 'Billing' },
      { id: 'general', name: 'General' },
      { id: 'other', name: 'Other' }
    ];
    
    res.json({ modules });
  } catch (error) {
    console.error('[QA] Get modules error:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
};

/**
 * Get list of users for assignment dropdown
 */
exports.getAssignableUsers = async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.user?.tenantId;
    
    const users = await prisma.$queryRaw`
      SELECT id, name, email, role
      FROM users
      WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
        AND status = 'active'
      ORDER BY name ASC
    `;
    
    res.json({ users });
  } catch (error) {
    console.error('[QA] Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
