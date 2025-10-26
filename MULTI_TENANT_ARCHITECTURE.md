# 🏗️ Hybrid Multi-Tenant ERP Architecture

## 📋 Overview

This document describes the complete hybrid multi-tenant architecture for BISMAN ERP.

### Architecture Pattern

**Hybrid Multi-Tenancy**: Database-per-tenant with centralized enterprise management.

```
┌─────────────────────────────────────────────────────────────┐
│                    ENTERPRISE DATABASE                       │
│  (Central Control: Admins, Clients, Modules, Audit)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Manages
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
   ┌────▼─────┐  ┌──────────┐  ┌──────────┐   │
   │ Client 1 │  │ Client 2 │  │ Client N │   │
   │   DB     │  │   DB     │  │   DB     │   │
   └──────────┘  └──────────┘  └──────────┘   │
   (Users, Roles, (Users, Roles, (Users, Roles,│
    Permissions,   Permissions,   Permissions, │
    Transactions)  Transactions)  Transactions)│
```

## 🎯 Key Benefits

1. **Data Isolation**: Each client has their own database (strongest isolation)
2. **Scalability**: Clients can be distributed across different DB servers
3. **Customization**: Per-tenant schema customization possible
4. **Performance**: No noisy neighbor problem
5. **Compliance**: Meets data residency and privacy requirements
6. **Backup/Recovery**: Per-tenant backup and restore
7. **Central Management**: Enterprise admins control all clients from one place

## 🗄️ Database Structure

### Enterprise Database (`enterprise_db`)

**Purpose**: Central control plane

**Contains**:
- Enterprise Admins (super users who manage the platform)
- Super Admins (assigned to modules/segments)
- Modules (available features)
- Clients (tenant metadata + DB connection URIs)
- Global Audit Logs

**Schema**: `prisma/schema.enterprise.prisma`

### Client Databases (`client_db_<id>`)

**Purpose**: Isolated tenant data

**Contains**:
- Users (tenant-specific users)
- Roles & Permissions (RBAC)
- Business Transactions
- Client-specific Audit Logs

**Schema**: `prisma/schema.client.prisma`

## 🔐 Authentication Flow

### Enterprise Admin Flow
```
1. Enterprise Admin → Login → JWT (enterprise-scoped)
2. Access /api/enterprise/* endpoints
3. Can create clients, super admins, manage modules
4. Full platform control
```

### Super Admin Flow
```
1. Super Admin → Login → JWT (with assigned modules)
2. Access /api/super-admin/* endpoints
3. Can view assigned clients
4. Manage client assignments
```

### Client User Flow
```
1. Client User → Login → JWT (tenant-scoped with tenant_id claim)
2. Access /api/client/* endpoints with x-tenant-id header
3. Middleware resolves tenant → loads correct client DB
4. User can only access data in their tenant DB
```

## 🔄 Tenant Resolution

### Multi-Strategy Tenant Detection

**Priority Order**:
1. JWT claim (`tenant_id`)
2. HTTP Header (`x-tenant-id`)
3. Subdomain (`tenant.app.com` → tenant ID lookup)
4. Query parameter (`?tenant=xyz`) - Dev only

### Middleware Flow
```typescript
Request → tenantResolver → 
  Check JWT/Header → 
  Fetch client from enterprise_db → 
  Get dbConnectionUri → 
  Initialize tenant-specific Prisma client → 
  Attach to req.tenant → 
  Next()
```

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 18+ (TypeScript)
- **Framework**: Express.js
- **ORM**: Prisma 5+
- **Database**: PostgreSQL 14+
- **Auth**: JWT (jsonwebtoken)
- **Caching**: LRU cache for Prisma clients
- **Pooling**: PgBouncer (transaction mode)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State**: React Context (Auth + Tenant)
- **HTTP Client**: Axios with interceptors

### DevOps
- **Migrations**: Prisma Migrate
- **Secrets**: Doppler / AWS Secrets Manager
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + Elasticsearch

## 🚀 Provisioning Flow

### New Client Onboarding

```typescript
1. Enterprise Admin creates client via API
   POST /api/enterprise/clients/create
   {
     name: "Acme Corp",
     superAdminId: "uuid",
     adminEmail: "admin@acme.com",
     segment: "retail"
   }

2. Backend provisions new database:
   - Generate unique DB name: client_<uuid>
   - Run CREATE DATABASE via admin connection
   - Apply client schema migrations
   - Store encrypted connection URI in enterprise_db

3. Response returns client ID
   {
     clientId: "uuid",
     dbName: "client_<uuid>",
     status: "ACTIVE"
   }

4. Super Admin can now access this client
   - Assign modules
   - Create initial client admin user
   - Configure roles/permissions
```

## 📊 Connection Management

### Dynamic Prisma Factory

```typescript
// Cache Prisma clients to avoid exhausting connections
const clientCache = new LRU<string, PrismaClient>({ max: 50 });

function getPrismaForClient(dbUri: string): PrismaClient {
  const hash = sha256(dbUri);
  if (cache.has(hash)) return cache.get(hash);
  
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUri } }
  });
  
  cache.set(hash, prisma);
  return prisma;
}
```

### Connection Pooling Strategy

**PgBouncer Configuration**:
```ini
[databases]
enterprise_db = host=localhost port=5432 dbname=enterprise_db
client_* = host=localhost port=5432

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

**Prisma Configuration**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Keep connection_limit low since PgBouncer handles pooling
  connection_limit = 10
}
```

## 🔒 Security Considerations

### 1. Connection String Encryption
```typescript
// Encrypt before storing in enterprise_db
const encrypted = encrypt(dbConnectionUri, MASTER_KEY);
client.dbConnectionUri = encrypted;

// Decrypt when creating Prisma client
const decrypted = decrypt(client.dbConnectionUri, MASTER_KEY);
const prisma = getPrismaForClient(decrypted);
```

### 2. Least Privilege DB Users
```sql
-- Admin user (for provisioning only)
CREATE USER db_admin WITH PASSWORD 'admin_pass';
GRANT CREATE ON DATABASE TO db_admin;

-- Client user (limited to single DB)
CREATE USER client_user_123 WITH PASSWORD 'client_pass';
GRANT CONNECT ON DATABASE client_db_123 TO client_user_123;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO client_user_123;
```

### 3. Tenant Validation
```typescript
// Always validate JWT tenant claim matches x-tenant-id
if (jwt.tenant_id !== req.headers['x-tenant-id']) {
  throw new Error('Tenant mismatch');
}

// Validate user has access to tenant
const access = await checkTenantAccess(userId, tenantId);
if (!access) throw new Error('Unauthorized tenant access');
```

### 4. Rate Limiting
```typescript
// Per-tenant rate limiting
const limiter = rateLimit({
  keyGenerator: (req) => `${req.user.id}:${req.tenant.id}`,
  max: 100, // requests per window
  windowMs: 15 * 60 * 1000 // 15 minutes
});
```

## 🔄 Migration Strategy

### Enterprise DB Migrations
```bash
# Create migration
npx prisma migrate dev --name add_client_metadata --schema=prisma/schema.enterprise.prisma

# Deploy to production
npx prisma migrate deploy --schema=prisma/schema.enterprise.prisma
```

### Client DB Migrations
```bash
# Test migration on dev client DB
export CLIENT_DATABASE_URL="postgresql://..."
npx prisma migrate dev --schema=prisma/schema.client.prisma

# Deploy to all client DBs (production)
node scripts/migrateAllClients.ts
```

### Automated Client Migration Script
```typescript
// scripts/migrateAllClients.ts
async function migrateAllClients() {
  const enterprise = getEnterprise();
  const clients = await enterprise.client.findMany({ 
    where: { status: 'ACTIVE' } 
  });
  
  for (const client of clients) {
    console.log(`Migrating ${client.name}...`);
    const dbUri = decrypt(client.dbConnectionUri);
    await runMigration(dbUri, 'prisma/schema.client.prisma');
  }
}
```

## 📈 Scalability Patterns

### Horizontal Scaling
```
Load Balancer
      ↓
  ┌───┴───┐
  │ API 1 │ API 2 │ API 3 │ (Stateless)
  └───┬───┘
      ↓
  PgBouncer (Connection Pooling)
      ↓
  ┌───┴───┐
  │ DB Primary │ → Replicas (Read)
  └───────┘
```

### Database Sharding
```
Shard by client_id range:
- Shard 1: clients 000-333
- Shard 2: clients 334-666  
- Shard 3: clients 667-999

Store shard assignment in enterprise_db:
Client { id, name, shardId, dbConnectionUri }
```

### Caching Strategy
```typescript
// Cache tenant metadata (5 min TTL)
const tenantCache = new LRU<string, Client>({ 
  max: 1000,
  ttl: 5 * 60 * 1000 
});

// Cache Prisma clients (reuse connections)
const prismaCache = new LRU<string, PrismaClient>({ 
  max: 50,
  dispose: (prisma) => prisma.$disconnect()
});
```

## 🧪 Testing Strategy

### Unit Tests
- Tenant resolver logic
- Connection manager caching
- Auth middleware validation
- Encryption/decryption utilities

### Integration Tests
- Create client → Provision DB → Run migrations
- Client login → Resolve tenant → Execute query
- Cross-tenant isolation (User A cannot access Tenant B data)

### Load Tests
- 1000 concurrent requests across 100 tenants
- Measure connection pool saturation
- Test PgBouncer queue times

## 📚 API Endpoints

### Enterprise APIs (`/api/enterprise/*`)
- `POST /clients/create` - Provision new client
- `GET /clients` - List all clients
- `PUT /clients/:id` - Update client metadata
- `POST /super-admins` - Create super admin
- `GET /modules` - List available modules
- `POST /audit` - Log enterprise action

### Super Admin APIs (`/api/super-admin/*`)
- `GET /clients` - List assigned clients
- `POST /clients/:id/assign-module` - Assign module to client
- `GET /clients/:id/users` - View client users

### Client APIs (`/api/client/*`)
- `POST /auth/login` - Client user login
- `GET /users` - List users (tenant-scoped)
- `POST /users` - Create user
- `GET /roles` - List roles
- `POST /roles/:id/permissions` - Assign permissions
- `GET /transactions` - List transactions

## 🎯 Future Enhancements

1. **Multi-region support**: Deploy client DBs closer to users
2. **Automated backups**: Per-tenant backup schedules
3. **Usage metering**: Track API usage per tenant for billing
4. **Feature flags**: Per-tenant feature toggles
5. **Custom schemas**: Allow tenants to add custom fields
6. **Data migration tools**: Move tenant between shards
7. **Compliance reports**: GDPR, SOC2, HIPAA audit trails

## 📖 Documentation Links

- [Setup Guide](./docs/SETUP.md)
- [API Reference](./docs/API.md)
- [Migration Guide](./docs/MIGRATIONS.md)
- [Security Best Practices](./docs/SECURITY.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

---

**Last Updated**: October 25, 2025
**Version**: 1.0.0
