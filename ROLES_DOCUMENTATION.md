# 📊 ROLES IN BISMAN ERP SYSTEM

## Current Role System

The `role` field in the User model is a **String field** (not an enum), which means you can use any role name.

```prisma
model User {
  role String? @db.VarChar(50)
  // ...
}
```

---

## ✅ Existing Roles in Your Database

Based on the current database, here are the roles being used:

### System-Level Roles
1. **ENTERPRISE_ADMIN** - Top-level system administrator
   - `enterprise@bisman.erp`

2. **SUPER_ADMIN** - Multi-tenant administrator
   - `business_superadmin@bisman.demo`

### Client-Level Roles (for Eazymiles or other clients)
3. **CFO** - Chief Financial Officer
4. **FINANCE_CONTROLLER** - Financial Operations Manager
5. **OPERATIONS_MANAGER** - Multi-site Operations
6. **HUB_INCHARGE** - Site Operations Lead
7. **HR_MANAGER** - Human Resources
8. **PROCUREMENT_OFFICER** - Vendor & Purchasing
9. **STORE_INCHARGE** - Warehouse & Inventory
10. **COMPLIANCE_OFFICER** - Regulatory Compliance
11. **LEGAL_HEAD** - Legal & Contracts
12. **ACCOUNTS_PAYABLE** - Invoice & Payment Processing

---

## ❌ No "ADMIN" Role Currently

**Answer: NO**, there is **NO generic "ADMIN" role** in your system.

### What you have instead:
- **ENTERPRISE_ADMIN** - System-wide admin (Bisman platform level)
- **SUPER_ADMIN** - Manages multiple clients
- **CLIENT_ADMIN** - Can be used for client administrators (not currently in use)

---

## 💡 Recommendation: Add CLIENT_ADMIN Role

For the Eazymiles admin user, I recommend using:

```javascript
role: 'CLIENT_ADMIN'  // Client-level administrator
```

This makes the hierarchy clear:
```
ENTERPRISE_ADMIN (Bisman System)
    ↓
SUPER_ADMIN (Manages multiple clients)
    ↓
CLIENT_ADMIN (Eazymiles Admin)
    ↓
Other Roles (CFO, HR_MANAGER, etc.)
```

---

## 🎯 Proposed Structure

### For Eazymiles Client Setup:

**Level 1: Bisman Platform**
- `enterprise@bisman.erp` - **ENTERPRISE_ADMIN**

**Level 2: Multi-Client Management**
- `business_superadmin@bisman.demo` - **SUPER_ADMIN**

**Level 3: Eazymiles Client**
- `admin@eazymiles.com` - **CLIENT_ADMIN** ✨ (Eazymiles administrator)

**Level 4: Eazymiles Employees**
- `rajesh.verma@eazymiles.com` - CFO
- `meera.singh@eazymiles.com` - FINANCE_CONTROLLER
- `vikram.reddy@eazymiles.com` - OPERATIONS_MANAGER
- ... (other roles)

---

## 🔧 Updated Setup Script

The `setup-eazymiles-client.js` I created uses **CLIENT_ADMIN** for the Eazymiles admin user:

```javascript
const eazymilesAdmin = await prisma.user.create({
  data: {
    email: 'admin@eazymiles.com',
    role: 'CLIENT_ADMIN',  // ✅ Client-level administrator
    tenant_id: eazymilesClient.id,
    // ...
  }
});
```

---

## 📝 Summary

| Role | Level | Description | Example User |
|------|-------|-------------|--------------|
| **ENTERPRISE_ADMIN** | Platform | Bisman system owner | enterprise@bisman.erp |
| **SUPER_ADMIN** | Multi-tenant | Manages clients | business_superadmin@bisman.demo |
| **CLIENT_ADMIN** | Client | Eazymiles admin | admin@eazymiles.com |
| **CFO** | Employee | Finance head | rajesh.verma@eazymiles.com |
| **FINANCE_CONTROLLER** | Employee | Finance operations | meera.singh@eazymiles.com |
| **OPERATIONS_MANAGER** | Employee | Operations | vikram.reddy@eazymiles.com |
| **HUB_INCHARGE** | Employee | Site manager | arun.kumar@eazymiles.com |
| **HR_MANAGER** | Employee | HR | priya.sharma@eazymiles.com |
| **PROCUREMENT_OFFICER** | Employee | Purchasing | amit.patel@eazymiles.com |
| **STORE_INCHARGE** | Employee | Warehouse | suresh.yadav@eazymiles.com |
| **COMPLIANCE_OFFICER** | Employee | Compliance | kavita.iyer@eazymiles.com |
| **LEGAL_HEAD** | Employee | Legal | deepak.mishra@eazymiles.com |
| **ACCOUNTS_PAYABLE** | Employee | AP | rohit.desai@eazymiles.com |

---

## ✅ Ready to Create Eazymiles Client

The script `setup-eazymiles-client.js` is ready to:
1. Create **Eazymiles** client
2. Create **admin@eazymiles.com** with role **CLIENT_ADMIN**
3. Create 10 employee users with their respective roles
4. All under the Eazymiles tenant

Just run:
```bash
cd my-backend
node setup-eazymiles-client.js
```
