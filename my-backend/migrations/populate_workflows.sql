-- =====================================================
-- BISMAN ERP - INITIAL WORKFLOWS DATA (25+ workflows)
-- High-frequency user tasks with UI navigation steps
-- =====================================================

-- =====================================================
-- GENERAL / PROFILE WORKFLOWS
-- =====================================================

INSERT INTO workflows (slug, module, title, description, ui_path, ui_path_mobile, ui_steps, required_roles, frontend_route, tags, keywords, priority, examples) VALUES

('profile_view', 'GENERAL', 'View My Profile', 
'View your personal profile including contact details, department, and role information.',
'Top-right profile photo → Profile',
'Tap ☰ Menu → Profile',
'[{"step":1,"action":"click","target":"Profile Photo","hint":"top-right corner"},{"step":2,"action":"view","target":"Profile Page"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN","FINANCE_ADMIN","INVENTORY_ADMIN","SUPER_ADMIN"]'::jsonb,
'/profile',
ARRAY['profile','personal','settings','account'],
ARRAY['my profile','view profile','see profile','personal details','my details','my info','about me'],
90,
'[{"q":"How do I see my profile?","a":"Click your profile photo (top-right) to view your profile."},{"q":"Where can I see my details?","a":"Your profile is accessible by clicking your photo in the top-right corner."}]'::jsonb),

('profile_edit', 'GENERAL', 'Edit My Profile',
'Update your contact information, address, emergency contact, and other personal details.',
'Top-right profile photo → Profile → Edit',
'Tap ☰ Menu → Profile → Edit',
'[{"step":1,"action":"click","target":"Profile Photo","hint":"top-right corner"},{"step":2,"action":"click","target":"Profile"},{"step":3,"action":"click","target":"Edit Button"},{"step":4,"action":"fill","target":"Phone, Email, Address fields"},{"step":5,"action":"click","target":"Save"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN","FINANCE_ADMIN","INVENTORY_ADMIN","SUPER_ADMIN"]'::jsonb,
'/profile/edit',
ARRAY['profile','edit','update','settings'],
ARRAY['edit profile','change profile','update profile','change phone','change email','change address','update details','modify profile'],
90,
'[{"q":"How do I change my phone number?","a":"Click profile photo → Profile → Edit → update phone → Save"},{"q":"How to update my email?","a":"Go to Profile → Edit and update your email address."}]'::jsonb),

('change_password', 'GENERAL', 'Change Password',
'Change your login password for security.',
'Top-right profile photo → Settings → Security → Change Password',
'Tap ☰ Menu → Settings → Change Password',
'[{"step":1,"action":"click","target":"Profile Photo","hint":"top-right corner"},{"step":2,"action":"click","target":"Settings"},{"step":3,"action":"click","target":"Security"},{"step":4,"action":"click","target":"Change Password"},{"step":5,"action":"fill","target":"Current Password, New Password, Confirm Password"},{"step":6,"action":"click","target":"Update Password"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN","FINANCE_ADMIN","INVENTORY_ADMIN","SUPER_ADMIN"]'::jsonb,
'/settings/security',
ARRAY['password','security','settings','account'],
ARRAY['change password','reset password','new password','update password','password change','forgot password'],
85,
'[{"q":"How do I change my password?","a":"Go to Settings → Security → Change Password"},{"q":"Where to update password?","a":"Click profile photo → Settings → Security → Change Password"}]'::jsonb),

-- =====================================================
-- HR / ATTENDANCE WORKFLOWS
-- =====================================================

('attendance_view', 'HR', 'View My Attendance',
'Check your attendance records including check-in/out times, present days, and late entries.',
'Main Menu → HR → Attendance → My Attendance',
'Tap ☰ → HR → My Attendance',
'[{"step":1,"action":"click","target":"HR","hint":"left sidebar"},{"step":2,"action":"click","target":"Attendance"},{"step":3,"action":"click","target":"My Attendance"},{"step":4,"action":"select","target":"Date Range"},{"step":5,"action":"view","target":"Attendance Records"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN","SUPER_ADMIN"]'::jsonb,
'/hr/attendance/my-attendance',
ARRAY['attendance','hr','punch','checkin'],
ARRAY['my attendance','view attendance','check attendance','attendance record','punch in','punch out','checkin','checkout','present days'],
88,
'[{"q":"How do I check my attendance?","a":"Go to HR → Attendance → My Attendance"},{"q":"Where can I see my punch records?","a":"Navigate to HR → Attendance → My Attendance to view all your punch records."}]'::jsonb),

('attendance_correction', 'HR', 'Request Attendance Correction',
'Request correction for incorrect attendance entries with justification.',
'Main Menu → HR → Attendance → Request Correction',
'Tap ☰ → HR → Attendance → Correction',
'[{"step":1,"action":"click","target":"HR","hint":"left sidebar"},{"step":2,"action":"click","target":"Attendance"},{"step":3,"action":"click","target":"Request Correction"},{"step":4,"action":"select","target":"Date to Correct"},{"step":5,"action":"fill","target":"Correct In/Out Time"},{"step":6,"action":"fill","target":"Justification/Reason"},{"step":7,"action":"click","target":"Submit"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN"]'::jsonb,
'/hr/attendance/correction',
ARRAY['attendance','correction','hr','request'],
ARRAY['attendance correction','fix attendance','wrong attendance','correct punch','missed punch','forgot punch'],
85,
'[{"q":"How to correct wrong attendance?","a":"Go to HR → Attendance → Request Correction, select date, enter correct time and reason."},{"q":"I forgot to punch in, how to fix?","a":"Request attendance correction: HR → Attendance → Request Correction"}]'::jsonb),

('leave_apply', 'HR', 'Apply for Leave',
'Submit a leave application for approval.',
'Main Menu → HR → Leave → Apply Leave',
'Tap ☰ → HR → Apply Leave',
'[{"step":1,"action":"click","target":"HR","hint":"left sidebar"},{"step":2,"action":"click","target":"Leave"},{"step":3,"action":"click","target":"Apply Leave"},{"step":4,"action":"select","target":"Leave Type (Casual/Sick/Earned)"},{"step":5,"action":"select","target":"From Date - To Date"},{"step":6,"action":"fill","target":"Reason"},{"step":7,"action":"click","target":"Submit"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN"]'::jsonb,
'/hr/leave/apply',
ARRAY['leave','hr','request','vacation'],
ARRAY['apply leave','request leave','leave application','take leave','vacation','time off','casual leave','sick leave','earned leave'],
90,
'[{"q":"How do I apply for leave?","a":"Go to HR → Leave → Apply Leave, select type and dates, add reason and submit."},{"q":"Where to request time off?","a":"HR → Leave → Apply Leave"}]'::jsonb),

('leave_balance', 'HR', 'Check Leave Balance',
'View your available leave balance by type.',
'Main Menu → HR → Leave → My Leave Balance',
'Tap ☰ → HR → Leave Balance',
'[{"step":1,"action":"click","target":"HR","hint":"left sidebar"},{"step":2,"action":"click","target":"Leave"},{"step":3,"action":"click","target":"My Leave Balance"},{"step":4,"action":"view","target":"Leave Balances by Type"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN"]'::jsonb,
'/hr/leave/balance',
ARRAY['leave','balance','hr'],
ARRAY['leave balance','how many leaves','available leaves','remaining leaves','leave count','check leaves'],
88,
'[{"q":"How many leaves do I have?","a":"Check HR → Leave → My Leave Balance to see available leaves by type."},{"q":"Where to see leave balance?","a":"Go to HR → Leave → My Leave Balance"}]'::jsonb),

('leave_approve', 'HR', 'Approve Leave Requests',
'Approve or reject pending leave requests from your team (Manager/HR only).',
'Main Menu → HR → Approvals → Leave Approvals',
'Tap ☰ → Approvals → Leave',
'[{"step":1,"action":"click","target":"HR","hint":"left sidebar"},{"step":2,"action":"click","target":"Approvals"},{"step":3,"action":"click","target":"Leave Approvals"},{"step":4,"action":"view","target":"Pending Requests"},{"step":5,"action":"click","target":"Request to Review"},{"step":6,"action":"click","target":"Approve or Reject"},{"step":7,"action":"fill","target":"Comments (optional)"}]'::jsonb,
'["MANAGER","HR_ADMIN","SUPER_ADMIN"]'::jsonb,
'/hr/approvals/leave',
ARRAY['leave','approve','hr','manager'],
ARRAY['approve leave','leave approval','pending leaves','team leave','reject leave','leave requests'],
85,
'[{"q":"How do I approve leave?","a":"Go to HR → Approvals → Leave Approvals, review and approve/reject requests."},{"q":"Where to see pending leave requests?","a":"HR → Approvals → Leave Approvals shows all pending requests."}]'::jsonb),

-- =====================================================
-- TASKS & APPROVALS WORKFLOWS
-- =====================================================

('tasks_view', 'TASKS', 'View My Tasks',
'View all tasks assigned to you with status and due dates.',
'Main Menu → Tasks → My Tasks',
'Tap ☰ → Tasks',
'[{"step":1,"action":"click","target":"Tasks","hint":"left sidebar"},{"step":2,"action":"click","target":"My Tasks"},{"step":3,"action":"filter","target":"Status/Priority/Due Date"},{"step":4,"action":"view","target":"Task List"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN","FINANCE_ADMIN","INVENTORY_ADMIN","SUPER_ADMIN"]'::jsonb,
'/tasks',
ARRAY['tasks','work','todo'],
ARRAY['my tasks','view tasks','task list','pending tasks','assigned tasks','todo','work items'],
90,
'[{"q":"How do I see my tasks?","a":"Go to Tasks → My Tasks to view all assigned tasks."},{"q":"Where are my pending tasks?","a":"Tasks → My Tasks, filter by Pending status."}]'::jsonb),

('task_create', 'TASKS', 'Create New Task',
'Create and assign a new task to yourself or team members.',
'Main Menu → Tasks → New Task',
'Tap ☰ → Tasks → + New',
'[{"step":1,"action":"click","target":"Tasks","hint":"left sidebar"},{"step":2,"action":"click","target":"New Task"},{"step":3,"action":"fill","target":"Task Title"},{"step":4,"action":"fill","target":"Description"},{"step":5,"action":"select","target":"Priority"},{"step":6,"action":"select","target":"Due Date"},{"step":7,"action":"select","target":"Assignee"},{"step":8,"action":"click","target":"Create"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN","SUPER_ADMIN"]'::jsonb,
'/tasks/new',
ARRAY['tasks','create','assign'],
ARRAY['create task','new task','add task','assign task','make task'],
85,
'[{"q":"How do I create a task?","a":"Go to Tasks → New Task, fill details and assign."},{"q":"How to assign work to someone?","a":"Tasks → New Task → select Assignee → Create"}]'::jsonb),

('approvals_pending', 'APPROVALS', 'View Pending Approvals',
'View all items waiting for your approval.',
'Main Menu → Approvals → Pending',
'Tap ☰ → Approvals',
'[{"step":1,"action":"click","target":"Approvals","hint":"left sidebar"},{"step":2,"action":"click","target":"Pending"},{"step":3,"action":"view","target":"All Pending Items"},{"step":4,"action":"click","target":"Item to Review"},{"step":5,"action":"click","target":"Approve or Reject"}]'::jsonb,
'["MANAGER","HR_ADMIN","FINANCE_ADMIN","INVENTORY_ADMIN","SUPER_ADMIN"]'::jsonb,
'/approvals',
ARRAY['approvals','pending','review'],
ARRAY['pending approvals','my approvals','what to approve','approval queue','waiting approval'],
88,
'[{"q":"What do I need to approve?","a":"Go to Approvals → Pending to see all items awaiting your approval."},{"q":"Where are pending approvals?","a":"Approvals → Pending in the main menu."}]'::jsonb),

-- =====================================================
-- INVENTORY WORKFLOWS
-- =====================================================

('stock_check', 'INVENTORY', 'Check Stock Availability',
'View current stock levels for any item.',
'Main Menu → Inventory → Stock Ledger',
'Tap ☰ → Inventory → Stock',
'[{"step":1,"action":"click","target":"Inventory","hint":"left sidebar"},{"step":2,"action":"click","target":"Stock Ledger"},{"step":3,"action":"search","target":"Item/Product Name"},{"step":4,"action":"select","target":"Warehouse/Location"},{"step":5,"action":"view","target":"Current Qty, Reserved, Available"}]'::jsonb,
'["INVENTORY_ADMIN","MANAGER","STORE_KEEPER","SUPER_ADMIN"]'::jsonb,
'/inventory/stock',
ARRAY['inventory','stock','warehouse'],
ARRAY['check stock','stock level','available stock','item quantity','how much stock','inventory check'],
90,
'[{"q":"How do I check stock?","a":"Go to Inventory → Stock Ledger, search for item to see availability."},{"q":"Where to see item quantity?","a":"Inventory → Stock Ledger → Search Item"}]'::jsonb),

('stock_transfer', 'INVENTORY', 'Transfer Stock Between Warehouses',
'Move stock from one warehouse/location to another.',
'Main Menu → Inventory → Stock Transfer',
'Tap ☰ → Inventory → Transfer',
'[{"step":1,"action":"click","target":"Inventory","hint":"left sidebar"},{"step":2,"action":"click","target":"Stock Transfer"},{"step":3,"action":"select","target":"Source Warehouse"},{"step":4,"action":"select","target":"Destination Warehouse"},{"step":5,"action":"add","target":"Items and Quantities"},{"step":6,"action":"click","target":"Submit"},{"step":7,"action":"wait","target":"Approval (if required)"}]'::jsonb,
'["INVENTORY_ADMIN","STORE_KEEPER","SUPER_ADMIN"]'::jsonb,
'/inventory/transfer',
ARRAY['inventory','transfer','warehouse'],
ARRAY['transfer stock','move inventory','warehouse transfer','stock movement','inter-warehouse'],
85,
'[{"q":"How to transfer stock?","a":"Go to Inventory → Stock Transfer, select warehouses, add items and submit."},{"q":"How to move items between warehouses?","a":"Inventory → Stock Transfer"}]'::jsonb),

('grn_create', 'INVENTORY', 'Create Goods Receipt Note (GRN)',
'Record goods received from a vendor against a purchase order.',
'Main Menu → Inventory → Goods Receipt → New GRN',
'Tap ☰ → Inventory → GRN',
'[{"step":1,"action":"click","target":"Inventory","hint":"left sidebar"},{"step":2,"action":"click","target":"Goods Receipt"},{"step":3,"action":"click","target":"New GRN"},{"step":4,"action":"select","target":"Purchase Order"},{"step":5,"action":"enter","target":"Received Quantities"},{"step":6,"action":"check","target":"Quality (if applicable)"},{"step":7,"action":"click","target":"Confirm Receipt"}]'::jsonb,
'["INVENTORY_ADMIN","STORE_KEEPER","SUPER_ADMIN"]'::jsonb,
'/inventory/grn/new',
ARRAY['inventory','grn','receipt','purchase'],
ARRAY['grn','goods receipt','receive goods','inward','vendor delivery','po receipt'],
85,
'[{"q":"How to create GRN?","a":"Go to Inventory → Goods Receipt → New GRN, select PO and enter received quantities."},{"q":"How to record goods received?","a":"Inventory → Goods Receipt → New GRN"}]'::jsonb),

-- =====================================================
-- PURCHASE WORKFLOWS
-- =====================================================

('po_create', 'PURCHASE', 'Create Purchase Order',
'Create a new purchase order for vendor.',
'Main Menu → Purchase → Create PO',
'Tap ☰ → Purchase → New PO',
'[{"step":1,"action":"click","target":"Purchase","hint":"left sidebar"},{"step":2,"action":"click","target":"Create PO"},{"step":3,"action":"select","target":"Vendor"},{"step":4,"action":"add","target":"Items with Quantities"},{"step":5,"action":"review","target":"Pricing and Taxes"},{"step":6,"action":"click","target":"Submit for Approval"}]'::jsonb,
'["PURCHASE_ADMIN","MANAGER","SUPER_ADMIN"]'::jsonb,
'/purchase/po/new',
ARRAY['purchase','po','order','vendor'],
ARRAY['purchase order','create po','new po','buy items','order from vendor','vendor order'],
85,
'[{"q":"How to create a purchase order?","a":"Go to Purchase → Create PO, select vendor, add items and submit."},{"q":"How to order from vendor?","a":"Purchase → Create PO"}]'::jsonb),

-- =====================================================
-- SALES WORKFLOWS
-- =====================================================

('invoice_create', 'SALES', 'Create Invoice',
'Create a sales invoice for a customer.',
'Main Menu → Sales → Billing → Create Invoice',
'Tap ☰ → Sales → Invoice',
'[{"step":1,"action":"click","target":"Sales","hint":"left sidebar"},{"step":2,"action":"click","target":"Billing"},{"step":3,"action":"click","target":"Create Invoice"},{"step":4,"action":"select","target":"Customer"},{"step":5,"action":"add","target":"Products/Services"},{"step":6,"action":"apply","target":"Discounts (if any)"},{"step":7,"action":"review","target":"Taxes (auto-calculated)"},{"step":8,"action":"click","target":"Generate Invoice"}]'::jsonb,
'["SALES_ADMIN","CASHIER","MANAGER","SUPER_ADMIN"]'::jsonb,
'/sales/invoice/new',
ARRAY['sales','invoice','billing'],
ARRAY['create invoice','generate invoice','new invoice','billing','make bill','customer bill'],
90,
'[{"q":"How to create an invoice?","a":"Go to Sales → Billing → Create Invoice, select customer, add items and generate."},{"q":"How to bill a customer?","a":"Sales → Billing → Create Invoice"}]'::jsonb),

('quotation_create', 'SALES', 'Create Quotation',
'Create a price quotation for a customer.',
'Main Menu → Sales → Quotations → New Quote',
'Tap ☰ → Sales → Quotation',
'[{"step":1,"action":"click","target":"Sales","hint":"left sidebar"},{"step":2,"action":"click","target":"Quotations"},{"step":3,"action":"click","target":"New Quote"},{"step":4,"action":"select","target":"Customer"},{"step":5,"action":"add","target":"Products with Pricing"},{"step":6,"action":"set","target":"Validity Period"},{"step":7,"action":"add","target":"Terms & Conditions"},{"step":8,"action":"click","target":"Generate Quote"}]'::jsonb,
'["SALES_ADMIN","MANAGER","SUPER_ADMIN"]'::jsonb,
'/sales/quotation/new',
ARRAY['sales','quotation','quote'],
ARRAY['quotation','create quote','price quote','estimate','proposal'],
85,
'[{"q":"How to create a quotation?","a":"Go to Sales → Quotations → New Quote, add items and generate."},{"q":"How to send price estimate?","a":"Sales → Quotations → New Quote"}]'::jsonb),

('orders_pending', 'SALES', 'View Pending Orders',
'View all pending sales orders awaiting fulfillment.',
'Main Menu → Sales → Orders → Pending',
'Tap ☰ → Sales → Orders',
'[{"step":1,"action":"click","target":"Sales","hint":"left sidebar"},{"step":2,"action":"click","target":"Orders"},{"step":3,"action":"click","target":"Pending"},{"step":4,"action":"filter","target":"Customer, Date, Priority"},{"step":5,"action":"view","target":"Order List"}]'::jsonb,
'["SALES_ADMIN","MANAGER","DISPATCH","SUPER_ADMIN"]'::jsonb,
'/sales/orders/pending',
ARRAY['sales','orders','pending'],
ARRAY['pending orders','open orders','orders to fulfill','sales orders','order status'],
85,
'[{"q":"Where are pending orders?","a":"Go to Sales → Orders → Pending to see all orders awaiting fulfillment."},{"q":"How to check order status?","a":"Sales → Orders → search by order number"}]'::jsonb),

-- =====================================================
-- FINANCE WORKFLOWS
-- =====================================================

('payment_voucher', 'FINANCE', 'Create Payment Voucher',
'Create a payment voucher for vendor payment.',
'Main Menu → Finance → Payments → New Payment',
'Tap ☰ → Finance → Payment',
'[{"step":1,"action":"click","target":"Finance","hint":"left sidebar"},{"step":2,"action":"click","target":"Payments"},{"step":3,"action":"click","target":"New Payment"},{"step":4,"action":"select","target":"Vendor/Party"},{"step":5,"action":"enter","target":"Payment Amount"},{"step":6,"action":"select","target":"Payment Mode (Cash/Bank/UPI)"},{"step":7,"action":"attach","target":"Reference Invoice/Bill"},{"step":8,"action":"click","target":"Submit"}]'::jsonb,
'["FINANCE_ADMIN","CASHIER","SUPER_ADMIN"]'::jsonb,
'/finance/payment/new',
ARRAY['finance','payment','voucher'],
ARRAY['payment voucher','vendor payment','pay supplier','make payment','cash payment'],
85,
'[{"q":"How to create payment voucher?","a":"Go to Finance → Payments → New Payment, select vendor and enter details."},{"q":"How to pay vendor?","a":"Finance → Payments → New Payment"}]'::jsonb),

('receipt_voucher', 'FINANCE', 'Create Receipt Voucher',
'Record a payment received from customer.',
'Main Menu → Finance → Receipts → New Receipt',
'Tap ☰ → Finance → Receipt',
'[{"step":1,"action":"click","target":"Finance","hint":"left sidebar"},{"step":2,"action":"click","target":"Receipts"},{"step":3,"action":"click","target":"New Receipt"},{"step":4,"action":"select","target":"Customer"},{"step":5,"action":"enter","target":"Amount Received"},{"step":6,"action":"select","target":"Payment Mode"},{"step":7,"action":"link","target":"Invoice (optional)"},{"step":8,"action":"click","target":"Save"}]'::jsonb,
'["FINANCE_ADMIN","CASHIER","SUPER_ADMIN"]'::jsonb,
'/finance/receipt/new',
ARRAY['finance','receipt','collection'],
ARRAY['receipt voucher','customer payment','collection','receive money','cash receipt'],
85,
'[{"q":"How to record customer payment?","a":"Go to Finance → Receipts → New Receipt, select customer and enter amount."},{"q":"How to create receipt?","a":"Finance → Receipts → New Receipt"}]'::jsonb),

('ledger_view', 'FINANCE', 'View Account Ledger',
'View transaction ledger for any account or party.',
'Main Menu → Finance → Ledger',
'Tap ☰ → Finance → Ledger',
'[{"step":1,"action":"click","target":"Finance","hint":"left sidebar"},{"step":2,"action":"click","target":"Ledger"},{"step":3,"action":"select","target":"Account/Party"},{"step":4,"action":"select","target":"Date Range"},{"step":5,"action":"view","target":"Transactions and Running Balance"}]'::jsonb,
'["FINANCE_ADMIN","MANAGER","SUPER_ADMIN"]'::jsonb,
'/finance/ledger',
ARRAY['finance','ledger','account'],
ARRAY['ledger','account ledger','party ledger','statement','account balance','transactions'],
85,
'[{"q":"How to view ledger?","a":"Go to Finance → Ledger, select account and date range."},{"q":"Where to check account balance?","a":"Finance → Ledger → select account"}]'::jsonb),

-- =====================================================
-- REPORTS WORKFLOWS
-- =====================================================

('reports_sales', 'REPORTS', 'Generate Sales Report',
'Generate various sales reports and analytics.',
'Main Menu → Sales → Reports',
'Tap ☰ → Sales → Reports',
'[{"step":1,"action":"click","target":"Sales","hint":"left sidebar"},{"step":2,"action":"click","target":"Reports"},{"step":3,"action":"select","target":"Report Type"},{"step":4,"action":"select","target":"Date Range"},{"step":5,"action":"click","target":"Generate"},{"step":6,"action":"click","target":"Export (PDF/Excel)"}]'::jsonb,
'["SALES_ADMIN","MANAGER","SUPER_ADMIN"]'::jsonb,
'/sales/reports',
ARRAY['reports','sales','analytics'],
ARRAY['sales report','revenue report','sales analytics','sales data','daily sales'],
85,
'[{"q":"How to generate sales report?","a":"Go to Sales → Reports, select type and date range, then generate."},{"q":"Where to see sales data?","a":"Sales → Reports"}]'::jsonb),

('reports_attendance', 'REPORTS', 'Generate Attendance Report',
'Generate attendance reports for self or team.',
'Main Menu → HR → Reports → Attendance',
'Tap ☰ → HR → Reports',
'[{"step":1,"action":"click","target":"HR","hint":"left sidebar"},{"step":2,"action":"click","target":"Reports"},{"step":3,"action":"click","target":"Attendance Report"},{"step":4,"action":"select","target":"Date Range and Filters"},{"step":5,"action":"click","target":"Generate"},{"step":6,"action":"click","target":"Export (PDF/Excel)"}]'::jsonb,
'["EMPLOYEE","MANAGER","HR_ADMIN","SUPER_ADMIN"]'::jsonb,
'/hr/reports/attendance',
ARRAY['reports','hr','attendance'],
ARRAY['attendance report','download attendance','attendance excel','punch report'],
85,
'[{"q":"How to export attendance report?","a":"Go to HR → Reports → Attendance, select range and export."},{"q":"Where to download attendance?","a":"HR → Reports → Attendance Report → Export"}]'::jsonb),

-- =====================================================
-- ADMIN WORKFLOWS
-- =====================================================

('user_create', 'ADMIN', 'Create New User',
'Create a new user account in the system (Admin only).',
'Main Menu → Admin → User Management → Add User',
'Tap ☰ → Admin → Users',
'[{"step":1,"action":"click","target":"Admin","hint":"left sidebar"},{"step":2,"action":"click","target":"User Management"},{"step":3,"action":"click","target":"Add User"},{"step":4,"action":"fill","target":"Name, Email, Role, Department"},{"step":5,"action":"assign","target":"Permissions"},{"step":6,"action":"click","target":"Save"}]'::jsonb,
'["HR_ADMIN","SUPER_ADMIN"]'::jsonb,
'/admin/users/new',
ARRAY['admin','users','management'],
ARRAY['create user','add user','new user','new employee','user management'],
80,
'[{"q":"How to add a new user?","a":"Go to Admin → User Management → Add User (requires Admin access)."},{"q":"How to create employee login?","a":"Admin → User Management → Add User"}]'::jsonb),

('role_assign', 'ADMIN', 'Assign Role to User',
'Change or assign role to an existing user.',
'Main Menu → Admin → User Management → Select User → Edit Role',
'Tap ☰ → Admin → Users → Edit',
'[{"step":1,"action":"click","target":"Admin","hint":"left sidebar"},{"step":2,"action":"click","target":"User Management"},{"step":3,"action":"search","target":"User"},{"step":4,"action":"click","target":"Edit"},{"step":5,"action":"select","target":"New Role"},{"step":6,"action":"click","target":"Save"}]'::jsonb,
'["HR_ADMIN","SUPER_ADMIN"]'::jsonb,
'/admin/users',
ARRAY['admin','roles','permissions'],
ARRAY['assign role','change role','user role','update permissions','role assignment'],
80,
'[{"q":"How to change user role?","a":"Go to Admin → User Management → select user → Edit → change role."},{"q":"How to assign permissions?","a":"Admin → User Management → Edit User → Assign Role"}]'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  ui_path = EXCLUDED.ui_path,
  ui_path_mobile = EXCLUDED.ui_path_mobile,
  ui_steps = EXCLUDED.ui_steps,
  required_roles = EXCLUDED.required_roles,
  frontend_route = EXCLUDED.frontend_route,
  tags = EXCLUDED.tags,
  keywords = EXCLUDED.keywords,
  examples = EXCLUDED.examples,
  updated_at = NOW();

-- =====================================================
-- INSERT ROLE MAPPINGS
-- =====================================================
INSERT INTO workflow_role_map (workflow_id, role_id)
SELECT w.id, r.role
FROM workflows w
CROSS JOIN LATERAL jsonb_array_elements_text(w.required_roles) AS r(role)
ON CONFLICT (workflow_id, role_id) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Inserted ' || COUNT(*) || ' workflows' as result FROM workflows WHERE is_active = true;
