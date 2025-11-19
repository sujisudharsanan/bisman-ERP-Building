# Multi-Tenant SuperAdmin Refactor Plan (2025-11-16)

## Goal
Refactor current `SUPER_ADMIN` usage so existing super admin user(s) are downgraded to `ADMIN`, and introduce a new top-level `PLATFORM_SUPER_ADMIN` (or `SYSTEM_ADMIN`) who can:
- Create & manage multiple Clients (tenants) for any ERP product type
- Assign modules & per-module permissions to each Client
- Control role permission templates per client (fine-grained CRUD flags)
- Monitor usage (active users, module usage events, subscription metrics)

## Current State Summary
- `User.role` includes: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`, `CFO`, `FINANCE_CONTROLLER`, `HUB_INCHARGE`, `SYSTEM_ADMIN` (observed in checks).
- Separate `SuperAdmin` table represents business/pump specific owner (one per top-level customer grouping) with `clients` and `users` relations.
- `Client` table already references `super_admin_id`.
- Permissions currently seeded per `role` × `module` with full access for `SUPER_ADMIN` and `ADMIN`.

## New Role Hierarchy
```
PLATFORM_SUPER_ADMIN (highest) / SYSTEM_ADMIN
   ↳ SuperAdmin (Business/Pump Owner)  [existing SuperAdmin table]
        ↳ Admin (current SUPER_ADMIN user becomes this)
            ↳ Manager / CFO / Finance_Controller / Hub_Incharge / Staff
```
Notes:
- Rename logical meaning of existing `SUPER_ADMIN` in `User.role` to `ADMIN`.
- Introduce `PLATFORM_SUPER_ADMIN` role only in `User.role` (OR repurpose existing `SYSTEM_ADMIN` if already intended for platform-level). Prefer unifying to `SYSTEM_ADMIN` to avoid proliferation.
- Keep `SuperAdmin` table name (represents Tenant Owner) but treat those records as created/managed by PLATFORM_SUPER_ADMIN.

## Data Model Changes
1. Add `platform_super_admin` concept:
   - Option A: Use existing `EnterpriseAdmin` as parent for SuperAdmins (already exists). Ensure that a designated `EnterpriseAdmin` user with elevated role acts as PLATFORM_SUPER_ADMIN.
   - Option B: Add new table `PlatformSuperAdmin` (may be redundant). We'll AVOID new table; reuse `EnterpriseAdmin`.
2. Extend `User.role` enum logic (no DB enum change since role is String) to include `PLATFORM_SUPER_ADMIN` (if not using `SYSTEM_ADMIN`).
3. Add new tables:
   - `client_module_permissions` (per client, per module, with CRUD flags, overrides role template). Fields: id (pk), client_id (uuid), module_id (int), can_view bool, can_create bool, can_edit bool, can_delete bool, created_at, updated_at. Unique(client_id,module_id).
   - `client_usage_events` (id, client_id, module_id, user_id, event_type, meta JSON, occurred_at timestamp, indexed by client_id+module_id+occurred_at).
   - `client_daily_usage` (date, client_id, module_id, view_count, create_count, edit_count, delete_count, active_users, PRIMARY KEY(date, client_id, module_id)). Populated by daily cron aggregation.

## Migration Steps
1. Identify all `User` rows where `role='SUPER_ADMIN'` → update to `ADMIN`.
2. Create initial PLATFORM_SUPER_ADMIN user (if not present):
   - Email: `platform@bisman.system`
   - Role: `SYSTEM_ADMIN` (reuse) or `PLATFORM_SUPER_ADMIN`.
3. Update permission seeding: grant full access to `SYSTEM_ADMIN` and `ADMIN`; keep `SuperAdmin` table for scoping clients.
4. Backfill `client_module_permissions` defaults based on existing role permissions: for each client and module, copy `ADMIN` permission flags as initial values.
5. Ensure existing logic referencing `SUPER_ADMIN` in checks is updated to treat `ADMIN` similarly, and expand gate to include `SYSTEM_ADMIN` where platform-level operations are needed.

## Authorization Middleware Adjustments
- Replace arrays: `['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN']` → `['ADMIN', 'SYSTEM_ADMIN']` for user creation etc.
- Add dedicated checks for tenant owner operations: require `SuperAdmin` table linkage + user.role in [`ADMIN`, `SYSTEM_ADMIN`].
- Platform operations (create SuperAdmin, manage global modules) require `SYSTEM_ADMIN`.

## Endpoints To Add
1. `POST /api/platform/clients` (SYSTEM_ADMIN only) – create client with assignment of productType and initial modules.
2. `GET /api/platform/clients` (SYSTEM_ADMIN) – list all.
3. `POST /api/platform/super-admins` – create a new SuperAdmin (tenant owner) tied to EnterpriseAdmin.
4. `GET /api/clients/:id/modules/permissions` – view effective permissions (merge of role permission + client override).
5. `PUT /api/clients/:id/modules/:moduleId/permissions` – update overrides.
6. `GET /api/clients/:id/usage/daily` – aggregated usage from `client_daily_usage`.
7. `POST /api/usage/event` – record usage events (internal instrumentation helper).

## Usage Tracking Design
- Frontend & backend register events: VIEW_MODULE, CREATE_RECORD, EDIT_RECORD, DELETE_RECORD, LOGIN.
- Write to `client_usage_events` asynchronously (queue or direct insert; for MVP direct insert with minimal fields).
- Nightly cron aggregates last 24h into `client_daily_usage`.

## Minimal Prisma Additions
```prisma
model ClientModulePermission {
  id          Int      @id @default(autoincrement())
  client_id   String   @db.Uuid
  module_id   Int
  can_view    Boolean  @default(true)
  can_create  Boolean  @default(false)
  can_edit    Boolean  @default(false)
  can_delete  Boolean  @default(false)
  created_at  DateTime @default(now()) @db.Timestamp(6)
  updated_at  DateTime @default(now()) @updatedAt @db.Timestamp(6)

  client      Client   @relation(fields: [client_id], references: [id], onDelete: Cascade)
  module      Module   @relation(fields: [module_id], references: [id], onDelete: Cascade)

  @@unique([client_id, module_id])
  @@index([client_id], map: "idx_client_module_permissions_client")
  @@index([module_id], map: "idx_client_module_permissions_module")
  @@map("client_module_permissions")
}

model ClientUsageEvent {
  id          Int      @id @default(autoincrement())
  client_id   String   @db.Uuid
  module_id   Int?
  user_id     Int?
  event_type  String   @db.VarChar(50)
  meta        Json?
  occurred_at DateTime @default(now()) @db.Timestamp(6)

  client      Client   @relation(fields: [client_id], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [user_id], references: [id], onDelete: SetNull)
  module      Module?  @relation(fields: [module_id], references: [id], onDelete: SetNull)

  @@index([client_id], map: "idx_client_usage_events_client")
  @@index([module_id], map: "idx_client_usage_events_module")
  @@index([occurred_at], map: "idx_client_usage_events_time")
  @@map("client_usage_events")
}

model ClientDailyUsage {
  date        DateTime @db.Date
  client_id   String   @db.Uuid
  module_id   Int?
  view_count  Int      @default(0)
  create_count Int     @default(0)
  edit_count  Int      @default(0)
  delete_count Int     @default(0)
  active_users Int     @default(0)
  updated_at  DateTime @default(now()) @updatedAt @db.Timestamp(6)

  client      Client   @relation(fields: [client_id], references: [id], onDelete: Cascade)
  module      Module?  @relation(fields: [module_id], references: [id], onDelete: SetNull)

  @@id([date, client_id, module_id])
  @@index([client_id], map: "idx_client_daily_usage_client")
  @@index([module_id], map: "idx_client_daily_usage_module")
  @@map("client_daily_usage")
}
```

## Migration Script Outline (`scripts/migrate_super_admin_refactor.js`)
```js
// 1. Update roles
await prisma.user.updateMany({ where: { role: 'SUPER_ADMIN' }, data: { role: 'ADMIN' }});

// 2. Ensure system admin exists
const sys = await prisma.user.upsert({
  where: { email: 'platform@bisman.system' },
  update: {},
  create: { username: 'platform_root', email: 'platform@bisman.system', password: hash('ChangeMe123!'), role: 'SYSTEM_ADMIN' }
});

// 3. Seed client_module_permissions defaults
const clients = await prisma.client.findMany();
const modules = await prisma.module.findMany();
for (const c of clients) {
  for (const m of modules) {
    await prisma.clientModulePermission.upsert({
      where: { client_id_module_id: { client_id: c.id, module_id: m.id }},
      update: {},
      create: { client_id: c.id, module_id: m.id, can_view: true, can_create: true, can_edit: true, can_delete: true }
    });
  }
}
```

## Frontend Impact
- Replace checks for `SUPER_ADMIN` with `ADMIN` where tenant-level admin features shown.
- Add new global settings page visible only for `SYSTEM_ADMIN`.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Hardcoded 'SUPER_ADMIN' string in many places | Run grep and batch replace with role mapping helper function. |
| Permission escalation accidentally broad | Centralize role arrays into constants (`ROLE_PLATFORM_ADMIN`, `ROLE_TENANT_ADMIN`). |
| Migration rollback complexity | Provide backup export of affected user rows before update. |
| Performance impact of usage events | Add minimal indexing and optionally batch inserts later. |

## Step Execution Order
1. Add new Prisma models & migrate.
2. Implement migration script for role update & permission defaults.
3. Refactor constants & middleware role arrays.
4. Add new endpoints & usage event recording.
5. Add aggregation cron (can be deferred).
6. Update frontend & docs.

## Acceptance Criteria
- Existing super admin can still manage tenant users as `ADMIN`.
- New system admin can create additional SuperAdmin (tenant owners) and clients.
- Per-client module permissions editable and enforced.
- Usage events collected and retrievable.
- Documentation reflects changes.

## Next
Proceed to implement Prisma schema additions and migration script.
