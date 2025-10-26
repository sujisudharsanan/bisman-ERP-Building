# 🔐 Demo User Credentials

This document contains all demo user login credentials for testing the BISMAN ERP system.

---

## 🏢 Enterprise Management

### Enterprise Admin (Highest Level)
- **Name**: Enterprise Admin
- **Email**: `enterprise@bisman.erp`
- **Password**: `enterprise123`
- **Role**: ENTERPRISE_ADMIN
- **Access**: 
  - Create and manage all Super Admins (businesses)
  - Assign modules per business
  - Control subscriptions and limits
  - View consolidated revenue and analytics
  - Manage all businesses from one dashboard
- **Dashboard**: `/enterprise-admin/dashboard`

---

## 🏪 Business Super Admins

### Petrol Pump Super Admin
- **Name**: Rajesh Kumar
- **Business**: Rajesh Petrol Pump - Highway 44, Karnataka
- **Email**: `rajesh@petrolpump.com`
- **Password**: `petrol123`
- **Role**: SUPER_ADMIN (Petrol Pump)
- **Modules**: 11 modules
  - Dashboard
  - Users
  - Settings
  - Payments
  - Non-Privileged Users
  - Fuel Sales
  - Tank Inventory
  - Shift Management
  - Suppliers
  - Reports
  - (1 more)
- **Dashboard**: `/super-admin`

### Logistics Super Admin
- **Name**: Amit Shah
- **Business**: ABC Logistics Pvt Ltd, Mumbai
- **Email**: `amit@abclogistics.com`
- **Password**: `logistics123`
- **Role**: SUPER_ADMIN (Logistics)
- **Modules**: 12 modules
  - Dashboard
  - Users
  - Settings
  - Payments
  - Non-Privileged Users
  - Shipments
  - Fleet Management
  - Routes
  - Delivery Tracking
  - Warehouses
  - Reports
  - (1 more)
- **Dashboard**: `/super-admin`

---

## 👨‍💼 Petrol Pump Staff

### Manager (Petrol Pump)
- **Email**: `manager@petrolpump.com`
- **Password**: `manager123`
- **Role**: MANAGER
- **Reports to**: Rajesh (Petrol Pump Super Admin)

### Staff (Petrol Pump)
- **Email**: `staff@petrolpump.com`
- **Password**: `staff123`
- **Role**: STAFF
- **Reports to**: Rajesh (Petrol Pump Super Admin)

---

## 🚚 Logistics Staff

### Manager (Logistics)
- **Email**: `manager@abclogistics.com`
- **Password**: `manager123`
- **Role**: MANAGER
- **Reports to**: Amit (Logistics Super Admin)

### Staff (Logistics)
- **Email**: `staff@abclogistics.com`
- **Password**: `staff123`
- **Role**: STAFF
- **Reports to**: Amit (Logistics Super Admin)

---

## 🔧 System Demo Users

### Super Admin (System)
- **Email**: `demo_super_admin@bisman.demo`
- **Password**: `Demo@123`
- **Role**: SUPER_ADMIN
- **Department**: System Administration
- **Dashboard**: `/super-admin`

### IT Admin
- **Email**: `demo_it_admin@bisman.demo`
- **Password**: `Demo@123`
- **Role**: IT_ADMIN
- **Department**: IT & Platform
- **Dashboard**: `/it-admin`

---

## 💼 Finance Demo Users

### CFO
- **Email**: `demo_cfo@bisman.demo`
- **Password**: `Demo@123`
- **Role**: CFO
- **Dashboard**: `/cfo-dashboard`

### Finance Controller
- **Email**: `demo_finance_controller@bisman.demo`
- **Password**: `Demo@123`
- **Role**: FINANCE_CONTROLLER
- **Dashboard**: `/finance-controller`

### Treasury
- **Email**: `demo_treasury@bisman.demo`
- **Password**: `Demo@123`
- **Role**: TREASURY
- **Dashboard**: `/treasury`

### Accounts
- **Email**: `demo_accounts@bisman.demo`
- **Password**: `Demo@123`
- **Role**: ACCOUNTS
- **Dashboard**: `/accounts`

### Accounts Payable
- **Email**: `demo_accounts_payable@bisman.demo`
- **Password**: `Demo@123`
- **Role**: ACCOUNTS_PAYABLE
- **Dashboard**: `/accounts-payable`

### Banker
- **Email**: `demo_banker@bisman.demo`
- **Password**: `Demo@123`
- **Role**: BANKER
- **Dashboard**: `/banker`

---

## 📦 Operations Demo Users

### Procurement Officer
- **Email**: `demo_procurement_officer@bisman.demo`
- **Password**: `Demo@123`
- **Role**: PROCUREMENT_OFFICER
- **Dashboard**: `/procurement-officer`

### Store Incharge
- **Email**: `demo_store_incharge@bisman.demo`
- **Password**: `Demo@123`
- **Role**: STORE_INCHARGE
- **Dashboard**: `/store-incharge`

### Operations Manager
- **Email**: `demo_operations_manager@bisman.demo`
- **Password**: `Demo@123`
- **Role**: MANAGER
- **Dashboard**: `/operations-manager`

### Hub Incharge
- **Email**: `demo_hub_incharge@bisman.demo`
- **Password**: `Demo@123`
- **Role**: HUB_INCHARGE
- **Dashboard**: `/hub-incharge`

---

## ⚖️ Compliance & Legal Demo Users

### Compliance Officer
- **Email**: `demo_compliance@bisman.demo`
- **Password**: `Demo@123`
- **Role**: COMPLIANCE
- **Dashboard**: `/compliance-officer`

### Legal
- **Email**: `demo_legal@bisman.demo`
- **Password**: `Demo@123`
- **Role**: LEGAL
- **Dashboard**: `/legal`

---

## 🎯 Testing Scenarios

### Scenario 1: Enterprise Admin Creates Business
1. Login as **Enterprise Admin** (`enterprise@bisman.erp` / `enterprise123`)
2. Go to Dashboard or Super Admins list
3. Click "Create Super Admin"
4. Fill business details
5. Assign modules
6. Test login with new Super Admin credentials

### Scenario 2: Super Admin Manages Business
1. Login as **Petrol Pump Super Admin** (`rajesh@petrolpump.com` / `petrol123`)
2. View only assigned 11 modules
3. Cannot see Logistics modules
4. Cannot access other businesses
5. Can manage users in their business

### Scenario 3: Module Assignment
1. Login as **Enterprise Admin**
2. Go to Super Admins → Manage Modules (Petrol Pump)
3. Enable/disable modules
4. Set CRUD permissions
5. Save changes
6. Logout and login as **Petrol Pump Super Admin**
7. Verify sidebar shows updated modules

### Scenario 4: Multi-Business Testing
1. Login as **Enterprise Admin**
2. View both businesses in dashboard
3. Compare revenue, user counts
4. Check recent activity
5. Search and filter businesses

---

## 🚀 Quick Access URLs

- **Login Page**: `/auth/login`
- **Enterprise Admin Dashboard**: `/enterprise-admin/dashboard`
- **Create Super Admin**: `/enterprise-admin/super-admins/create`
- **Manage Super Admins**: `/enterprise-admin/super-admins`
- **Module Assignment**: `/enterprise-admin/super-admins/[id]/modules`

---

## 📝 Notes

### Default Passwords
- **Enterprise Admin**: `enterprise123`
- **Petrol Pump Users**: `petrol123` (Super Admin), `manager123` (Manager), `staff123` (Staff)
- **Logistics Users**: `logistics123` (Super Admin), `manager123` (Manager), `staff123` (Staff)
- **Demo Users**: `Demo@123`

### Password Policy
- Minimum 8 characters
- No special character requirements (for demo)
- **Production**: Enforce strong password policy with special chars, numbers, uppercase

### Security Notes
- These are DEMO credentials only
- Never use in production
- Change all passwords before deployment
- Enable 2FA for production
- Implement account lockout after failed attempts

---

## 🔄 How to Reset Demo Data

1. **Database Reset**:
   ```bash
   cd my-backend
   psql $DATABASE_URL < migrations/multi-business-setup.sql
   ```

2. **Seed Demo Users**:
   ```bash
   node seed-demo-data.js
   ```

3. **Verify**:
   - Login as Enterprise Admin
   - Check all businesses exist
   - Verify module assignments

---

## 📊 User Hierarchy

```
ENTERPRISE_ADMIN (You)
  ├── Controls all Super Admins
  ├── Assigns modules per business
  └── Manages subscriptions
  
SUPER_ADMIN (Petrol Pump - Rajesh)
  ├── rajesh@petrolpump.com
  ├── Manages Petrol Pump business
  ├── 11 modules assigned
  └── Staff:
      ├── manager@petrolpump.com (MANAGER)
      └── staff@petrolpump.com (STAFF)
  
SUPER_ADMIN (Logistics - Amit)
  ├── amit@abclogistics.com
  ├── Manages Logistics business
  ├── 12 modules assigned
  └── Staff:
      ├── manager@abclogistics.com (MANAGER)
      └── staff@abclogistics.com (STAFF)
```

---

## 💡 Pro Tips

1. **Use "Fill" button** in login page demo users section to auto-fill credentials
2. **Use "Quick Login"** to login instantly without typing
3. **Test different roles** to see permission differences
4. **Check sidebar** - each role sees different modules
5. **Try module assignment** - disable a module and verify it disappears from sidebar

---

## 🐛 Troubleshooting

### Can't Login?
- Check if database migration was run
- Verify seed script executed successfully
- Check browser console for errors
- Clear cookies and try again

### Modules Not Showing?
- Verify module assignments in database
- Check if trigger fired on Super Admin creation
- Manually assign modules via Enterprise Admin

### Wrong Dashboard?
- Check role in users table
- Verify role-based routing in login page
- Check AuthContext for correct user data

---

**Last Updated**: January 15, 2025  
**Version**: 1.0.0  
**Status**: ✅ Demo Credentials Active
