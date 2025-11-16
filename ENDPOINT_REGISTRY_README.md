## Endpoint Registry System

### Purpose
Provides a non-destructive, idempotent record of API surface area (base mounts + individual endpoints) in `routes` and `rbac_routes` tables, enabling:
1. Drift detection vs code.
2. Permission scaffolding for RBAC.
3. Auditable change history of new endpoints.

### Components
- `scripts/register-mounted-routes.js`: registers top-level `app.use('/api/...')` mounts.
- `scripts/register-rbac-routes.js`: mirrors base mounts into `rbac_routes` for coarse access mapping.
- `scripts/register-endpoints.js`: scans route files for `router.<method>('path')` definitions and attempts endpoint-level registration.
- Foreign keys: `module_id` columns link routes and rbac_routes to `modules(id)` with ON DELETE SET NULL behavior.
- Deep metadata columns: `source_file`, `handler_count`, `middleware_count`, `has_params`, `last_scanned_at` (populated on re-scan).

### Running
```bash
cd my-backend
npm run registry:routes:register       # base mounts
npm run registry:rbac:register         # base mounts into RBAC
npm run registry:endpoints             # individual endpoints
```

### Safety
- All scripts catch unique constraint violations and skip existing entries.
- No DELETE statements; purely additive.
- Sequence defaults validated with `npm run check:sequences`.

### Extending
1. Add method extraction for dynamic segments (currently static path regex).
2. Map middleware stacks for audit columns (future enhancement).
3. Add endpoint diff CI job to compare manifest vs DB and alert.
4. Normalize parameter paths (`/api/users/:id`) and add `canonical_path` column.

### Limitations
- Regex approach won't catch programmatic route registrations (e.g., `router[method](variable)` or loops).
- Dynamic parameters registered literally (e.g., `:id`).
- Middleware/handler counts are approximate (function/arrow detection heuristic).
- Does not parse nested routers created in other modules yet.

### Next Improvements
- Integrate parameter normalization (`/api/users/:id` canonical form) for uniqueness.
- Add `source_file` column to `routes` for traceability (migration needed).
- Generate permission templates for each endpoint (view/create/edit/delete flags).
 - Implement AST-based parser (recast / @babel/parser) for 100% accuracy.
 - Add CI diff between code AST extraction and DB rows.
	- Auto generate actions per method and baseline SUPER_ADMIN grants.

### AST Parsing & Permission Templates (Added 2025-11-16)
Workflow:
1. `npm run registry:endpoints:ast` builds `registry/endpoints-detailed.json`.
2. `npm run registry:endpoints:sync` syncs canonical_path + param_names.
3. `npm run permissions:generate` ensures method-derived actions and SUPER_ADMIN grants.

Current counts (example after run):
- rbac_actions: 18
- rbac_permissions: 601

Templates use naming pattern `ACTION:METHOD` (e.g., `VIEW:GET`).
Future: expand to role-specific scaffolds and fine-grained CRUD per resource.

Generated on 2025-11-16.
\n+### Chained Route Parsing & Multi-Role CRUD (Extended 2025-11-16)
Enhancements added:
1. Chained route support: `router.route('/resource/:id').get(...).post(...).delete(...)` now parsed by AST script (though current codebase has no such chains yet, yielding 0 endpoints in AST output).
2. Canonical path + param extraction retained for future chains (params transformed to `:param`).
3. Multi-role CRUD permission generator: `npm run permissions:generate:multi-role` creates missing `VIEW|CREATE|EDIT|DELETE` permissions for every (role, module) pair without duplicates using schema fields `can_view`, `can_create`, `can_edit`, `can_delete`.

Usage:
```bash
npm run permissions:generate:multi-role
```

Result example:
- created: 337 new permissions
- skipped: 1023 existing combinations

Rationale:
- Ensures baseline CRUD matrix for emerging roles.
- Non-destructive; honors existing granular flags.

Future roadmap:
- Detect & parse nested routers passed via variables.
- Associate permissions directly with endpoints (join table) for fine-grained RBAC.
- CI job to assert each HTTP method has corresponding VIEW/CREATE/EDIT/DELETE permission where applicable.