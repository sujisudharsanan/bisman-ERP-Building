# 🗄️ Database Strategy - Single DB with Tenant Isolation

## Current Approach: Single Database (Phase 1 & 2)

You're currently using a **single PostgreSQL database** with **logical tenant isolation** using the `tenant_id` field. This is the right approach for starting out!

### ✅ Benefits of Single Database Approach:

1. **Simpler to Manage**
   - One database connection
   - Easier backups
   - Simpler deployment
   - Lower infrastructure costs

2. **Faster Development**
   - No connection pooling complexity
   - Standard Prisma queries
   - Easier testing and debugging

3. **Cost Effective**
   - Single database server
   - Shared resources
   - Lower hosting costs

4. **Good for Most Use Cases**
   - Works well for 100s or even 1000s of clients
   - PostgreSQL can handle millions of rows easily
   - Proper indexing ensures good performance

---

## 🔐 How Tenant Isolation Works

### Data Structure:
```
┌────────────────────────────────────────┐
│         Single PostgreSQL DB            │
│                                         │
│  users table:                           │
│  ├─ id: 1, email: user1@abc.com        │
│  │  tenant_id: "uuid-abc"              │
│  │  productType: "BUSINESS_ERP"        │
│  │                                     │
│  ├─ id: 2, email: user2@abc.com        │
│  │  tenant_id: "uuid-abc"              │ ← Same tenant
│  │  productType: "BUSINESS_ERP"        │
│  │                                     │
│  └─ id: 3, email: user1@pump.com       │
│     tenant_id: "uuid-pump"             │ ← Different tenant
│     productType: "PUMP_ERP"            │
│                                         │
│  transactions table:                    │
│  ├─ id: 1, amount: 1000                │
│  │  tenant_id: "uuid-abc"              │ ← ABC's data
│  │                                     │
│  └─ id: 2, amount: 5000                │
│     tenant_id: "uuid-pump"             │ ← Pump's data
└────────────────────────────────────────┘
```

### Key Principle:
**Every table that stores client-specific data must have a `tenant_id` column.**

---

## 🛠️ Implementation Checklist

### ✅ Already Implemented:
- [x] Users table has `tenant_id` field
- [x] Clients table created with unique IDs
- [x] Super admins can manage multiple clients
- [x] Modules filtered by `productType`

### 📋 To Implement (Phase 2):
- [ ] Add `tenant_id` to all business data tables
- [ ] Create middleware to auto-inject `tenant_id` in queries
- [ ] Add indexes on `tenant_id` columns for performance
- [ ] Implement query filters in API endpoints

---

## 🔧 Adding tenant_id to Your Tables

### Example: Transactions Table

**Before:**
```prisma
model Transaction {
  id          Int      @id @default(autoincrement())
  amount      Decimal
  date        DateTime
  description String
  created_at  DateTime @default(now())
}
```

**After:**
```prisma
model Transaction {
  id          Int      @id @default(autoincrement())
  amount      Decimal
  date        DateTime
  description String
  
  // Multi-tenant field
  tenant_id   String   @db.Uuid
  client      Client   @relation(fields: [tenant_id], references: [id])
  
  created_at  DateTime @default(now())
  
  @@index([tenant_id])
}
```

### Tables That Need tenant_id:

**Business ERP Tables:**
- `transactions`
- `invoices`
- `employees`
- `departments`
- `purchase_orders`
- `inventory_items`
- `vendors`
- `customers`

**Pump ERP Tables:**
- `fuel_transactions`
- `pump_readings`
- `tank_inventory`
- `daily_sales`
- `shift_reports`
- `pump_machines`
- `attendants`

**Tables That DON'T Need tenant_id:**
- `users` (has it already)
- `enterprise_admins` (global)
- `super_admins` (global)
- `clients` (is the tenant itself)
- `modules` (global configuration)
- `permissions` (global configuration)

---

## 🚀 Query Patterns

### 1. Auto-Inject tenant_id in Middleware

```javascript
// middleware/tenantIsolation.js
const tenantIsolation = async (req, res, next) => {
  // Skip for enterprise admins
  if (req.user.role === 'ENTERPRISE_ADMIN') {
    return next();
  }
  
  // For super admins - they manage multiple clients
  if (req.user.role === 'SUPER_ADMIN') {
    // They can specify which client they're viewing
    req.tenant_id = req.query.client_id || req.body.tenant_id;
    return next();
  }
  
  // For regular users - locked to their tenant
  if (req.user.tenant_id) {
    req.tenant_id = req.user.tenant_id;
    return next();
  }
  
  return res.status(403).json({ error: 'No tenant access' });
};
```

### 2. Filter Queries by tenant_id

```javascript
// Get transactions for current tenant only
app.get('/api/transactions', tenantIsolation, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      tenant_id: req.tenant_id  // Automatically filtered!
    }
  });
  res.json(transactions);
});

// Create transaction - auto-assign tenant_id
app.post('/api/transactions', tenantIsolation, async (req, res) => {
  const transaction = await prisma.transaction.create({
    data: {
      ...req.body,
      tenant_id: req.tenant_id  // Automatically assigned!
    }
  });
  res.json(transaction);
});
```

### 3. Super Admin Viewing Multiple Clients

```javascript
// Super admin can switch between clients
app.get('/api/super-admin/clients/:clientId/transactions', async (req, res) => {
  // Verify super admin owns this client
  const client = await prisma.client.findFirst({
    where: {
      id: req.params.clientId,
      super_admin_id: req.user.id  // Must be their client
    }
  });
  
  if (!client) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Get transactions for this specific client
  const transactions = await prisma.transaction.findMany({
    where: {
      tenant_id: client.id
    }
  });
  
  res.json(transactions);
});
```

---

## 🔮 Future Migration Path (Phase 3+)

When you need to scale further (1000+ clients or data residency requirements), you can migrate to:

### Option A: Database per Super Admin
```
Business Super Admin → business_erp_db
Pump Super Admin → pump_erp_db
```

### Option B: Database per Client
```
Client ABC Mfg → abc_manufacturing_db
Client XYZ Ind → xyz_industries_db
Client HP Pump → hp_petrol_db
```

### Option C: Hybrid (Recommended for Scale)
```
Enterprise DB → Metadata (admins, modules, client info)
Client DBs → Individual client data
```

**Migration Steps (Future):**
1. Export each client's data (filtered by tenant_id)
2. Create new database for that client
3. Import data into new database
4. Update connection string in clients table
5. Route queries to appropriate database

---

## 📊 Performance Considerations

### Current Single DB Setup:

**Good for:**
- Up to 1000 clients
- Millions of total records
- Standard CRUD operations
- Moderate transaction volume

**Optimizations:**
```sql
-- Add indexes on tenant_id for fast filtering
CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_employees_tenant ON employees(tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_transactions_tenant_date 
  ON transactions(tenant_id, created_at DESC);
```

**When to Consider Separate Databases:**
- Individual clients exceeding 10M records
- Specific data residency requirements (EU, US, etc.)
- Need for client-specific backups
- Extreme isolation requirements (banking, healthcare)
- Performance degradation despite optimization

---

## ✅ Your Current Status

```
✅ PHASE 1: Database schema with tenant isolation - COMPLETE
✅ Single PostgreSQL database - OPTIMAL for now
✅ tenant_id field in users table
✅ Clients table with UUIDs
✅ Ready for middleware implementation

🎯 NEXT: Add tenant_id to business data tables as you build features
```

---

## 🎯 Action Items

**Immediate (Phase 2):**
1. Create tenant isolation middleware
2. Add tenant_id to existing business tables
3. Update all queries to filter by tenant_id
4. Test data isolation between clients

**Future (Phase 3+):**
1. Monitor database performance
2. Plan migration strategy when needed
3. Implement database-per-tenant if required

---

## 💡 Best Practices

1. **Always filter by tenant_id**
   ```javascript
   // ❌ BAD - no tenant filter
   const users = await prisma.user.findMany();
   
   // ✅ GOOD - filtered by tenant
   const users = await prisma.user.findMany({
     where: { tenant_id: req.tenant_id }
   });
   ```

2. **Never trust client-provided tenant_id**
   ```javascript
   // ❌ BAD - user can fake tenant_id
   const data = req.body;
   await prisma.transaction.create({ data });
   
   // ✅ GOOD - server determines tenant_id
   const data = {
     ...req.body,
     tenant_id: req.user.tenant_id  // From authenticated user
   };
   await prisma.transaction.create({ data });
   ```

3. **Test data isolation thoroughly**
   - Create test clients
   - Verify users can't see other clients' data
   - Test super admin client switching
   - Check API endpoints for leaks

---

## 📚 Summary

**Single Database Strategy:**
- ✅ Perfect for starting your SaaS
- ✅ Scales to hundreds/thousands of clients
- ✅ Much simpler than multi-database
- ✅ Easy to manage and backup
- ✅ Can migrate later if needed

**Your Implementation:**
- ✅ Schema supports tenant isolation
- ✅ tenant_id ready to use
- 🎯 Add middleware next
- 🎯 Add tenant_id to business tables as you build

You made the right choice! 🎉
