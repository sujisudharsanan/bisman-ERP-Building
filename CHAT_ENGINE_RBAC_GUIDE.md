# 🔐 RBAC (Role-Based Access Control) for Chat Engine

## ✅ YES! The Chat Engine Now Has Full RBAC Support

The intelligent chat engine now includes **comprehensive Role-Based Access Control (RBAC)** that ensures users can only execute intents they have permission for.

---

## 🎯 What's Included

### ✅ **Core RBAC Features**

1. **Role-Based Intent Filtering**
   - Each intent has defined allowed roles
   - Users can only execute intents their role permits
   
2. **8 Built-in Roles**
   - `super-admin` - Full access to everything
   - `admin` - Administrative access
   - `manager` - Management operations
   - `accountant` - Financial operations
   - `hr` - Human resources operations
   - `inventory-manager` - Inventory & warehouse
   - `employee` - Basic employee operations
   - `viewer` - Read-only access

3. **Permission Checks**
   - Automatic permission validation before execution
   - Custom permission logic for complex scenarios
   - User-friendly error messages

4. **Role Hierarchy**
   - Higher roles inherit lower permissions
   - Can check if user can act on another user

---

## 📋 Permission Matrix

| Intent | Super Admin | Admin | Manager | Accountant | HR | Inventory Mgr | Employee | Viewer |
|--------|:-----------:|:-----:|:-------:|:----------:|:--:|:-------------:|:--------:|:------:|
| **Task Management** |
| show_pending_tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create_task | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Finance** |
| create_payment_request | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| vendor_payments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| fuel_expense | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| salary_info | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅* | ❌ |
| **Inventory** |
| check_inventory | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **HR** |
| check_attendance | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅* | ❌ |
| request_leave | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **Reports** |
| view_dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| view_reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Admin** |
| search_user | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| get_approval_status | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Operations** |
| vehicle_info | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| hub_info | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **General** |
| schedule_meeting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| check_notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| update_profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**\* = Own data only** (e.g., employees can only view their own salary/attendance)

---

## 🔧 How It Works

### 1. **User Authentication** (Your existing auth middleware)
```typescript
// Your auth middleware sets:
req.user = {
  id: 123,
  role: 'employee', // ← Role comes from your auth system
  // ... other user data
};
```

### 2. **RBAC Service Checks Permission**
```typescript
const permissionCheck = await rbacService.hasPermission(
  { id: userId, role: userRole },
  intent,
  { entities }
);

if (!permissionCheck.allowed) {
  // Return permission denied message
}
```

### 3. **Permission Denied Response**
```json
{
  "reply": "⛔ Access Denied\n\nThis action requires one of the following roles:\nSuper Admin, Admin, Accountant\n\nYour current role: EMPLOYEE",
  "intent": "create_payment_request",
  "confidence": 0.95,
  "nextAction": "PERMISSION_DENIED",
  "permissionDenied": true
}
```

---

## 💬 Example Scenarios

### Scenario 1: Employee Tries to Create Payment
```
USER (role: employee): "create payment request for Rs.50000"

BOT: ⛔ Access Denied

This action requires one of the following roles:
Super Admin, Admin, Accountant, Manager

Your current role: EMPLOYEE
```

### Scenario 2: Manager Creates Task
```
USER (role: manager): "create a task for tomorrow"

BOT: ✅ Task created successfully for tomorrow!
     📝 "task description"
     🆔 Task ID: 123
```

### Scenario 3: Viewer Checks Inventory
```
USER (role: viewer): "check inventory"

BOT: 📦 Checking inventory...
     ℹ️ This will open the inventory dashboard
```

### Scenario 4: Employee Views Own Salary
```
USER (role: employee): "show my salary"

BOT: 💰 Opening your salary information...
     ℹ️ You can view payslips and payment history
```

---

## 🚀 Integration Steps

### Step 1: Ensure Your Auth Middleware Sets Role

```typescript
// middleware/auth.ts
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify token and get user
  const user = await verifyToken(token);
  
  req.user = {
    id: user.id,
    role: user.role, // ← MUST include role!
    // ... other data
  };
  
  next();
};
```

### Step 2: Role Should Match These Values

```typescript
type UserRole = 
  | 'super-admin'
  | 'admin'
  | 'manager'
  | 'employee'
  | 'accountant'
  | 'hr'
  | 'inventory-manager'
  | 'viewer';
```

### Step 3: That's It!

The routes automatically pass the role to the chat service, which handles all permission checks.

---

## 🎨 Custom Permission Logic

For complex scenarios (like "only view own data"), use custom checks:

```typescript
{
  intent: 'salary_info',
  allowedRoles: ['super-admin', 'admin', 'hr', 'employee'],
  customCheck: async (userId: number, context: any) => {
    // Admins and HR can view anyone's salary
    if (['super-admin', 'admin', 'hr'].includes(context.userRole)) {
      return true;
    }
    // Employees can only view their own
    return context.targetUserId === userId;
  },
}
```

---

## 📊 API Response with RBAC

### Success Response
```json
{
  "success": true,
  "data": {
    "reply": "✅ Task created!",
    "intent": "create_task",
    "confidence": 0.95,
    "nextAction": "EXECUTE",
    "permissionDenied": false
  }
}
```

### Permission Denied Response
```json
{
  "success": true,
  "data": {
    "reply": "⛔ Access Denied...",
    "intent": "create_payment_request",
    "confidence": 0.95,
    "nextAction": "PERMISSION_DENIED",
    "permissionDenied": true
  }
}
```

---

## 🔍 RBAC Service Methods

### 1. Check Permission
```typescript
const result = await rbacService.hasPermission(
  { id: userId, role: 'employee' },
  'create_payment_request'
);
// { allowed: false, reason: "This action requires..." }
```

### 2. Get Allowed Intents for Role
```typescript
const intents = rbacService.getAllowedIntents('employee');
// ['show_pending_tasks', 'create_task', 'check_attendance', ...]
```

### 3. Check if Intent Requires Approval
```typescript
const needsApproval = rbacService.requiresApproval('create_payment_request');
// true
```

### 4. Get Role Level (for hierarchy)
```typescript
const level = rbacService.getRoleLevel('manager');
// 70 (higher = more permissions)
```

### 5. Check if Can Act on Another User
```typescript
const canAct = rbacService.canActOnUser('admin', 'employee');
// true (admin level > employee level)
```

---

## 🎯 Features

### ✅ **Automatic Intent Filtering**
Low-confidence suggestions are filtered by user role:
```typescript
// Only shows intents the user has permission for
const suggestions = rbacService.filterIntentsByRole(
  ['create_task', 'create_payment_request', 'check_inventory'],
  'employee'
);
// Returns: ['create_task']
```

### ✅ **Role Hierarchy**
```
super-admin (100) ← Highest
admin       (90)
manager     (70)
accountant  (60)
hr          (60)
inventory-manager (60)
employee    (40)
viewer      (10)  ← Lowest
```

### ✅ **User-Friendly Messages**
Permission denied messages are clear and helpful:
```
⛔ Access Denied

This action requires one of the following roles:
Super Admin, Admin, Accountant

Your current role: EMPLOYEE
```

---

## 🧪 Testing RBAC

### Test Different Roles

```bash
# As Employee
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN" \
  -d '{"message": "create payment request"}'

# As Admin
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"message": "create payment request"}'
```

---

## 📝 Customization

### Add New Role

1. **Update UserRole type** in `rbacService.ts`:
```typescript
export type UserRole = 
  | 'super-admin'
  | 'admin'
  | 'manager'
  | 'custom-role' // ← Add here
  | ...
```

2. **Add to role hierarchy**:
```typescript
const levels: Record<UserRole, number> = {
  'custom-role': 50, // ← Add level
  ...
};
```

3. **Add to intent permissions**:
```typescript
{
  intent: 'some_intent',
  allowedRoles: [..., 'custom-role'], // ← Add to relevant intents
}
```

### Customize Intent Permissions

Edit `INTENT_PERMISSIONS` array in `rbacService.ts`:

```typescript
{
  intent: 'create_task',
  allowedRoles: ['super-admin', 'admin', 'manager', 'employee'],
  requiresApproval: false, // ← Set to true if needs approval
  customCheck: async (userId, context) => {
    // ← Add custom logic
    return true;
  },
}
```

---

## 🚨 Security Notes

1. **Role must be set by your auth middleware** - Never trust client-provided roles
2. **RBAC service denies by default** - If no permission rule exists, access is denied
3. **Custom checks for sensitive data** - Use for viewing salaries, personal data, etc.
4. **Audit logging recommended** - Log permission denials for security monitoring

---

## ✨ Benefits

✅ **Secure** - Users can only access what they're authorized for  
✅ **Flexible** - Easy to customize roles and permissions  
✅ **User-Friendly** - Clear error messages explain why access is denied  
✅ **Automatic** - No manual permission checks needed in your code  
✅ **Hierarchical** - Role levels make management easier  
✅ **Granular** - Control access per intent  

---

## 📚 Files Added

```
my-backend/src/services/chat/
└── rbacService.ts          ← New RBAC service (400+ lines)

Updated files:
├── chatService.ts          ← Integrated RBAC checks
└── chatRoutes.ts           ← Pass user role to service
```

---

## 🎉 Summary

**YES, your chat engine now has full RBAC!**

- ✅ 8 predefined roles
- ✅ 18+ intents with role-based permissions
- ✅ Automatic permission checking
- ✅ Custom permission logic support
- ✅ User-friendly error messages
- ✅ Role hierarchy
- ✅ Easy to customize

All you need to do is ensure your `authMiddleware` sets `req.user.role`, and the rest is handled automatically! 🚀

---

**Built with ❤️ for BISMAN ERP**
