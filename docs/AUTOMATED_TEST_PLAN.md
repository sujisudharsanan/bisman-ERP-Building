# BISMAN ERP – Automated Test Plan
## Version: 1.0
## Last Updated: 2025-12-11

---

## Overview

This document outlines the comprehensive automated test plan for the BISMAN ERP Task Module. Tests are organized by priority and can be run in CI or locally via Cypress.

---

## Test Suite Summary

| Priority | Suite | File | Runtime | Description |
|----------|-------|------|---------|-------------|
| 1 | **Smoke** | `01-smoke.cy.ts` | ~30s | Critical path: load board, create task, read kanban |
| 2 | **Drawer** | `02-drawer.cy.ts` | ~2min | UI interactions: open/close drawer, inline edit, comments, attachments |
| 3 | **Drag & Drop** | `03-drag-drop.cy.ts` | ~2min | Kanban: move between columns, backend sync, rollback |
| 4 | **Real-time** | `04-realtime.cy.ts` | ~2min | Multi-client: create in A, verify in B |
| 5 | **Permissions** | `05-permissions.cy.ts` | ~3min | RBAC: role-based button visibility, API auth |
| 6 | **Pagination** | `06-pagination.cy.ts` | ~3min | Cursor pagination: seed 30+ messages, page through |
| 7 | **Performance** | `07-performance.cy.ts` | ~10min | SLO validation: P95 latencies, render times |
| 8 | **Accessibility** | `08-accessibility.cy.ts` | ~3min | A11y: keyboard navigation, ARIA, focus |

**Total Estimated Runtime:** ~25 minutes (full suite)

---

## Quick Start

### Run All Tests
```bash
cd my-frontend
npm run e2e
```

### Run Specific Suite
```bash
# Smoke tests only (fast)
npx cypress run --spec "cypress/e2e/01-smoke.cy.ts"

# Permissions tests
npx cypress run --spec "cypress/e2e/05-permissions.cy.ts"

# All except performance (faster CI)
npx cypress run --spec "cypress/e2e/0[1-6,8]*.cy.ts"
```

### Run Interactively
```bash
npm run e2e:open
```

---

## Environment Configuration

### Required Environment Variables

Set these in `cypress.config.ts` or via CLI:

```typescript
env: {
  API_URL: 'http://localhost:5000',
  
  // Primary test user (HUB_INCHARGE)
  TEST_USER_EMAIL: 'arun.kumar@bisman.demo',
  TEST_USER_PASSWORD: 'Demo@123',
  
  // Additional users for permission tests
  STAFF_EMAIL: 'staff@bisman.demo',
  STAFF_PASSWORD: 'Demo@123',
  VIEWER_EMAIL: 'viewer@bisman.demo',
  VIEWER_PASSWORD: 'Demo@123',
  
  // Cross-tenant test (optional)
  OTHER_TENANT_TOKEN: '...',
}
```

### Via CLI
```bash
CYPRESS_API_URL=https://staging.bisman.io \
CYPRESS_TEST_USER_EMAIL=test@example.com \
npx cypress run
```

---

## Test Details by Priority

### 1. Smoke Tests (Priority 1) ⚡
**File:** `cypress/e2e/01-smoke.cy.ts`

**Coverage:**
- ✅ API health check
- ✅ Board page loads
- ✅ Kanban columns display
- ✅ Task creation (API)
- ✅ Task creation (UI - if button exists)
- ✅ Kanban API returns data
- ✅ Task list with pagination
- ✅ Single task fetch
- ✅ Valid status transition (OPEN → IN_PROGRESS)
- ✅ Invalid transition rejection (409)

**When to Run:** Every PR, every deploy

---

### 2. Drawer Tests (Priority 2) 🗂️
**File:** `cypress/e2e/02-drawer.cy.ts`

**Coverage:**
- ✅ Open drawer by clicking task
- ✅ Close with Escape key
- ✅ Close with button
- ✅ Edit title inline
- ✅ Edit description
- ✅ Change priority
- ✅ Add comment (API)
- ✅ Add comment (UI)
- ✅ Display comments list
- ✅ Upload attachment (API)
- ✅ Upload attachment (UI)
- ✅ List attachments

**When to Run:** Feature changes, weekly regression

---

### 3. Drag & Drop Tests (Priority 3) 🔄
**File:** `cypress/e2e/03-drag-drop.cy.ts`

**Coverage:**
- ✅ Multiple columns display
- ✅ Drag task between columns
- ✅ Update position via API
- ✅ Backend status persistence
- ✅ Kanban API reflects changes
- ✅ Rollback on invalid transition
- ✅ Error toast on failure
- ✅ Rapid status changes

**When to Run:** Kanban changes, weekly regression

---

### 4. Real-time Tests (Priority 4) 📡
**File:** `cypress/e2e/04-realtime.cy.ts`

**Coverage:**
- ✅ WebSocket/SSE endpoint check
- ✅ Socket.IO detection
- ✅ Create task, verify in GET
- ✅ Update status, verify in kanban
- ✅ Add comment, verify in messages
- ✅ UI reflects API changes
- ✅ Optimistic updates
- ✅ Rollback on error
- ✅ Visibility change refresh

**When to Run:** Real-time feature changes

---

### 5. Permissions Tests (Priority 5) 🔐
**File:** `cypress/e2e/05-permissions.cy.ts`

**Coverage:**
- ✅ HUB_INCHARGE: full CRUD
- ✅ STAFF: limited access
- ✅ VIEWER: read-only
- ✅ Unauthorized rejection (401)
- ✅ Invalid token rejection
- ✅ Cross-tenant rejection (403/404)
- ✅ UI button visibility per role
- ✅ Delete button hidden for non-owners

**When to Run:** RBAC changes, security audits

---

### 6. Pagination Tests (Priority 6) 📄
**File:** `cypress/e2e/06-pagination.cy.ts`

**Coverage:**
- ✅ Seed 35+ messages
- ✅ Paginated response with limit
- ✅ Pagination metadata present
- ✅ Cursor-based pagination
- ✅ Non-overlapping pages
- ✅ Order maintained across pages
- ✅ hasMore flag correctness
- ✅ Offset-based pagination
- ✅ Task list pagination
- ✅ Edge cases (empty, limit=0, invalid cursor)
- ✅ UI load more / infinite scroll

**When to Run:** Pagination changes, API updates

---

### 7. Performance Tests (Priority 7) ⚡
**File:** `cypress/e2e/07-performance.cy.ts`

**Coverage:**
- ✅ Seed 100+ tasks
- ✅ Kanban API P95 < 1s
- ✅ Task list P95 < 500ms
- ✅ Single task P95 < 200ms
- ✅ Status change P95 < 500ms
- ✅ Kanban render P95 < 3s
- ✅ Smooth scroll performance
- ✅ Rapid interaction handling
- ✅ Memory leak check
- ✅ Concurrent request handling

**SLO Thresholds:**
| Metric | Target P95 |
|--------|------------|
| Kanban API | < 1000ms |
| Task List | < 500ms |
| Single Task | < 200ms |
| Status Change | < 500ms |
| Kanban Render | < 3000ms |

**When to Run:** Weekly, before major releases

---

### 8. Accessibility Tests (Priority 8) ♿
**File:** `cypress/e2e/08-accessibility.cy.ts`

**Coverage:**
- ✅ Tab navigation to board
- ✅ Task cards focusable
- ✅ Enter opens task
- ✅ Escape closes drawer
- ✅ Focus trap in modal
- ✅ Arrow key navigation
- ✅ Shift+Tab reverse nav
- ✅ Visible focus indicator
- ✅ Focus return after close
- ✅ Landmark roles
- ✅ Heading hierarchy
- ✅ Button labels
- ✅ Modal ARIA attributes
- ✅ Non-color status indicators
- ✅ Image alt text
- ✅ Form labels
- ✅ Live regions
- ✅ Touch target sizes

**WCAG 2.1 AA Compliance**

**When to Run:** UI changes, accessibility audits

---

## CI Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd my-frontend
          npm ci
          
      - name: Start backend
        run: |
          cd my-backend
          npm ci
          npm start &
          sleep 5
          
      - name: Run Smoke Tests
        run: |
          cd my-frontend
          npx cypress run --spec "cypress/e2e/01-smoke.cy.ts"
          
      - name: Run Full Suite (on main)
        if: github.ref == 'refs/heads/main'
        run: |
          cd my-frontend
          npx cypress run
```

---

## Test Data Management

### Fixtures
- `cypress/fixtures/task-data.json` - Test data configuration
- `cypress/fixtures/sample-attachment.txt` - File for upload tests

### Cleanup
All tests clean up created resources in `after()` hooks. If tests fail mid-run, orphaned test data may remain. Run cleanup script:

```bash
# Manual cleanup (if needed)
psql $DATABASE_URL -c "DELETE FROM workflow_tasks WHERE title LIKE '%Test%' OR title LIKE '%E2E%';"
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Cannot find 'cy'` | Reload VS Code or run `npx cypress verify` |
| Login fails | Check API_URL and credentials in config |
| Timeout errors | Increase `defaultCommandTimeout` in config |
| Flaky tests | Add `cy.wait()` or use `{ timeout: X }` |
| CORS errors | Ensure backend allows test origin |

### Debug Mode
```bash
DEBUG=cypress:* npx cypress run --spec "cypress/e2e/01-smoke.cy.ts"
```

---

## Reporting

### Generate HTML Report
```bash
npm install --save-dev cypress-mochawesome-reporter
npx cypress run --reporter mochawesome
```

### View Results
- Screenshots: `cypress/screenshots/`
- Videos: `cypress/videos/`
- Reports: `cypress/reports/`

---

## Maintenance

- **Weekly:** Run full suite on staging
- **Monthly:** Review and update selectors
- **Quarterly:** Update SLO thresholds based on metrics
- **On Change:** Update tests when features change

---

## Contact

| Role | Contact |
|------|---------|
| QA Lead | @qa-team |
| Dev Lead | @dev-team |
| Test Issues | #testing-help |
