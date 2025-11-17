# Temporary Client Lifecycle

This guide defines the lifecycle for clients registering online without full onboarding.

## Statuses
- Temporary: Created via public registration, minimal data, inactive.
- Active: Promoted after validation by Super Admin / Platform Admin.
- Draft: Internal save before activation (existing logic).
- Suspended / Disabled: Optional future states.

## Endpoints
### Register Temporary Client (Public)
```
POST /api/system/public/clients/register
{
  "legal_name": "Trial Corp",
  "email": "owner@trial.test",
  "phone": "+91-9999999999",
  "country": "IN"
}
```
Response:
```
201 { "success": true, "data": { "id": "uuid", "client_code": "uuid-or-generated", "status": "Temporary" } }
```

### List Clients (Filter by Status)
```
GET /api/system/clients?status=Temporary
```

### Promote Temporary Client
```
POST /api/system/clients/{id}/promote
200 { "success": true, "data": { "id": "uuid", "status": "Active" } }
```

## Promotion Rules
- Allowed roles: PLATFORM_ADMIN, TENANT_ADMIN, SUPER_ADMIN, ADMIN for owning tenant.
- Sets `is_active = true` and updates `enterprise.status = 'Active'`.

## Data Stored
Enterprise JSON (settings.enterprise) holds:
```
{
  "legal_name": "Trial Corp",
  "status": "Temporary",
  "contacts": [{ "name": "Trial Corp", "email": "owner@trial.test", "phone": "+91...", "primary": true }],
  "addresses": [{ "type": "registered", "country": "IN" }],
  "client_code": "server-or-fallback-generated"
}
```

## Backfill / Migration
Existing temporary records can be promoted by calling the promote endpoint or updating via PATCH (not recommended—use promote route for auditability).

## Future Enhancements
- Email verification before promotion.
- Rate limiting on public registration.
- CAPTCHA / anti-abuse.
- Automatic cleanup of stale Temporary clients after 30 days.

Document Date: 2025-11-17
