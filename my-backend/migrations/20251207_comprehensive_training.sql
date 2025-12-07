-- =====================================================
-- COMPREHENSIVE INTERNAL CHAT TRAINING DATA
-- No external dependencies - fully self-contained
-- =====================================================

-- GREETINGS & SMALL TALK
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('hello|hi|hey|greetings|good morning|good afternoon|good evening', 'greeting', 
E'👋 Hello! I''m **BEIA**, your BISMAN ERP Assistant.\n\nI can help you with:\n• 📋 Tasks & Approvals\n• 👥 HR & Leave\n• 💰 Finance & Payments\n• 📦 Inventory\n• 📊 Reports\n\nWhat would you like to do today?', 
'greeting', 10, '["hello", "hi there", "hey", "good morning", "good evening"]'::jsonb, ARRAY['hello', 'hi', 'hey', 'greet'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('how are you|how r u|hows it going|whats up|sup', 'greeting_howru', 
E'I''m doing great, thank you for asking! 😊 Ready to help you with anything in BISMAN ERP. What can I assist you with?', 
'greeting', 9, '["how are you", "how r u", "whats up"]'::jsonb, ARRAY['how', 'are', 'you'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('thank you|thanks|thx|ty|appreciate', 'thanks', 
E'You''re welcome! 😊 Happy to help. Let me know if there''s anything else you need.', 
'greeting', 9, '["thank you", "thanks a lot", "appreciate it"]'::jsonb, ARRAY['thank', 'thanks', 'appreciate'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('bye|goodbye|see you|later|cya|ttyl', 'goodbye', 
E'Goodbye! 👋 Have a great day. I''ll be here whenever you need help with BISMAN ERP!', 
'greeting', 9, '["bye", "goodbye", "see you later"]'::jsonb, ARRAY['bye', 'goodbye', 'later'])
ON CONFLICT DO NOTHING;

-- WHO AM I / ABOUT
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('who are you|what are you|your name|introduce yourself|about you', 'about_me', 
E'I''m **BEIA** (BISMAN ERP Intelligent Assistant) 🤖\n\n**What I can do:**\n• Answer questions about ERP features\n• Guide you through tasks step-by-step\n• Help with leave, attendance, tasks\n• Explain reports and data\n• Navigate you to the right page\n\nI learn from our conversations to serve you better!', 
'about', 10, '["who are you", "what is your name", "introduce yourself"]'::jsonb, ARRAY['who', 'what', 'name', 'about'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('what can you do|help me|capabilities|features|what do you know', 'capabilities', 
E'🎯 **Here''s what I can help with:**\n\n**HR & Employee:**\n• Leave application & balance\n• Attendance & punch in/out\n• Profile & documents\n\n**Tasks & Workflow:**\n• Create/view tasks\n• Pending approvals\n• Assignment status\n\n**Finance:**\n• Invoice queries\n• Payment status\n• Expense reports\n\n**Navigation:**\n• "Go to [page name]"\n• "How do I [action]?"\n\nJust ask naturally! 💬', 
'about', 10, '["what can you do", "help me", "show features"]'::jsonb, ARRAY['help', 'can', 'do', 'features'])
ON CONFLICT DO NOTHING;

-- LEAVE MANAGEMENT
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('apply.*leave|leave.*apply|want.*leave|need.*leave|request.*leave|take.*leave', 'leave_apply', 
E'📝 **Apply for Leave**\n\n**Steps:**\n1. Go to **HR → Leave Application**\n2. Select leave type (Casual/Sick/Earned)\n3. Choose dates\n4. Add reason\n5. Submit for approval\n\n**Quick tip:** Check your balance first with "show my leave balance"', 
'hr', 10, '["apply for leave", "I want to take leave", "request leave", "apply CL", "apply sick leave"]'::jsonb, ARRAY['apply', 'leave', 'request', 'take'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('leave.*balance|balance.*leave|how many.*leave|remaining.*leave|leave.*left', 'leave_balance', 
E'📊 **Your Leave Balance**\n\nTo check your leave balance:\n1. Go to **HR → Leave Balance**\n2. Or check **My Profile → Leave Summary**\n\n**Leave Types:**\n• CL (Casual Leave)\n• SL (Sick Leave)\n• EL (Earned Leave)\n• PL (Privilege Leave)', 
'hr', 10, '["check leave balance", "how many leaves left", "my leave balance", "remaining leaves"]'::jsonb, ARRAY['leave', 'balance', 'remaining', 'left'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('leave.*status|status.*leave|leave.*approved|leave.*pending', 'leave_status', 
E'📋 **Check Leave Status**\n\nTo see your leave request status:\n1. Go to **HR → My Leaves**\n2. Check the Status column\n\n**Status meanings:**\n• Pending - Awaiting approval\n• Approved - Leave granted\n• Rejected - Not approved\n• Cancelled - You cancelled it', 
'hr', 9, '["check leave status", "is my leave approved", "leave request status"]'::jsonb, ARRAY['leave', 'status', 'approved', 'pending'])
ON CONFLICT DO NOTHING;

-- ATTENDANCE
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('punch.*in|check.*in|clock.*in|mark.*attendance|start.*work', 'attendance_in', 
E'⏰ **Punch In / Check In**\n\n**Steps:**\n1. Go to **HR → Attendance**\n2. Click **Punch In** button\n3. Your location and time will be recorded\n\n**Or use Quick Actions:**\n• Click the clock icon in the header\n• Use the attendance widget on dashboard', 
'hr', 10, '["punch in", "check in", "clock in", "mark my attendance"]'::jsonb, ARRAY['punch', 'check', 'clock', 'in', 'attendance'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('punch.*out|check.*out|clock.*out|end.*work', 'attendance_out', 
E'⏰ **Punch Out / Check Out**\n\n**Steps:**\n1. Go to **HR → Attendance**\n2. Click **Punch Out** button\n3. Your working hours will be calculated\n\n**Tip:** Remember to punch out before leaving!', 
'hr', 10, '["punch out", "check out", "clock out", "end work"]'::jsonb, ARRAY['punch', 'check', 'clock', 'out'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('my.*attendance|attendance.*report|attendance.*history|work.*hours', 'attendance_report', 
E'📊 **Attendance Report**\n\n**View your attendance:**\n1. Go to **HR → Attendance Report**\n2. Select date range\n3. View daily/monthly summary\n\n**Shows:**\n• Present/Absent days\n• Late arrivals\n• Working hours\n• Overtime', 
'hr', 9, '["my attendance", "attendance report", "work hours", "attendance history"]'::jsonb, ARRAY['attendance', 'report', 'hours', 'history'])
ON CONFLICT DO NOTHING;

-- TASKS
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('create.*task|new.*task|add.*task|assign.*task', 'task_create', 
E'📝 **Create a New Task**\n\n**Steps:**\n1. Go to **Tasks → Create Task**\n2. Enter task title and description\n3. Assign to team member\n4. Set due date and priority\n5. Click Create\n\n**Or use Quick Create:**\n• Click + button in header\n• Say "create task for [name]"', 
'tasks', 10, '["create task", "new task", "add a task", "assign task"]'::jsonb, ARRAY['create', 'new', 'add', 'task', 'assign'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('my.*task|assigned.*task|task.*list|pending.*task|open.*task', 'task_list', 
E'📋 **Your Tasks**\n\n**View assigned tasks:**\n1. Go to **Tasks → My Tasks**\n2. Use filters: All, Pending, In Progress, Completed\n\n**Task Quick View:**\n• Dashboard shows top 5 pending tasks\n• Click any task to see details\n\n**Priority Colors:**\n• Red = High\n• Yellow = Medium\n• Green = Low', 
'tasks', 10, '["my tasks", "assigned tasks", "pending tasks", "task list"]'::jsonb, ARRAY['my', 'task', 'pending', 'assigned', 'list'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('complete.*task|finish.*task|done.*task|mark.*task.*done|close.*task', 'task_complete', 
E'✅ **Complete a Task**\n\n**To mark task as done:**\n1. Go to **Tasks → My Tasks**\n2. Click the task\n3. Change status to **Completed**\n4. Add completion notes (optional)\n5. Click Save\n\n**Quick Action:** Click the checkbox next to the task title.', 
'tasks', 9, '["complete task", "finish task", "mark task done", "close task"]'::jsonb, ARRAY['complete', 'finish', 'done', 'task', 'close'])
ON CONFLICT DO NOTHING;

-- APPROVALS
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('pending.*approval|my.*approval|approve.*request|waiting.*approval', 'approval_pending', 
E'📋 **Pending Approvals**\n\n**View items waiting for your approval:**\n1. Go to **Approvals → Pending**\n2. Or check the Approvals widget on Dashboard\n\n**Types of approvals:**\n• Leave requests\n• Expense claims\n• Purchase orders\n• Task completions\n\n**Quick Action:** Click notification bell for new approvals.', 
'approvals', 10, '["pending approvals", "my approvals", "approve request", "waiting for approval"]'::jsonb, ARRAY['pending', 'approval', 'approve', 'waiting'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('how.*approve|approve.*how|approval.*process', 'approval_how', 
E'✅ **How to Approve/Reject**\n\n**Steps:**\n1. Go to **Approvals → Pending**\n2. Click on the request\n3. Review the details\n4. Click **Approve** or **Reject**\n5. Add comments (optional)\n\n**Bulk Actions:** Select multiple items and use bulk approve/reject.', 
'approvals', 9, '["how to approve", "approve process", "reject request"]'::jsonb, ARRAY['how', 'approve', 'reject', 'process'])
ON CONFLICT DO NOTHING;

-- FINANCE & INVOICES
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('create.*invoice|new.*invoice|generate.*invoice|make.*invoice', 'invoice_create', 
E'🧾 **Create Invoice**\n\n**Steps:**\n1. Go to **Sales → Create Invoice**\n2. Select customer\n3. Add line items (products/services)\n4. Set payment terms\n5. Preview and send\n\n**Auto-features:**\n• Tax calculation\n• Invoice numbering\n• PDF generation', 
'finance', 10, '["create invoice", "new invoice", "generate invoice", "make bill"]'::jsonb, ARRAY['create', 'invoice', 'generate', 'bill'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('payment.*status|invoice.*paid|outstanding.*payment|due.*payment', 'payment_status', 
E'💰 **Payment Status**\n\n**Check payment status:**\n1. Go to **Finance → Receivables**\n2. View outstanding invoices\n3. Filter by customer or date\n\n**Status types:**\n• Paid - Payment received\n• Partial - Partial payment\n• Overdue - Past due date\n• Pending - Not yet due', 
'finance', 9, '["payment status", "invoice paid", "outstanding payments", "due payments"]'::jsonb, ARRAY['payment', 'status', 'paid', 'outstanding', 'due'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('expense.*report|submit.*expense|expense.*claim|reimbursement', 'expense_submit', 
E'💳 **Submit Expense**\n\n**Steps:**\n1. Go to **Finance → Expense Claims**\n2. Click **New Expense**\n3. Select category\n4. Enter amount and date\n5. Upload receipt\n6. Submit for approval\n\n**Tip:** Take photos of receipts for easy upload.', 
'finance', 9, '["expense report", "submit expense", "expense claim", "reimbursement"]'::jsonb, ARRAY['expense', 'report', 'claim', 'submit', 'reimbursement'])
ON CONFLICT DO NOTHING;

-- INVENTORY
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('check.*stock|stock.*level|inventory.*status|how many.*stock|available.*stock', 'stock_check', 
E'📦 **Check Stock Level**\n\n**Steps:**\n1. Go to **Inventory → Stock Status**\n2. Search by item name or code\n3. View current quantity\n\n**Quick Info:**\n• Green = Sufficient stock\n• Yellow = Low stock\n• Red = Out of stock\n\n**Tip:** Set up low stock alerts in Settings.', 
'inventory', 10, '["check stock", "stock level", "inventory status", "available stock"]'::jsonb, ARRAY['check', 'stock', 'inventory', 'available', 'level'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('add.*stock|stock.*entry|receive.*goods|goods.*receipt|grn', 'stock_add', 
E'📥 **Add Stock / GRN**\n\n**Steps:**\n1. Go to **Inventory → Goods Receipt**\n2. Select Purchase Order (if applicable)\n3. Enter received quantities\n4. Verify and save\n\n**GRN = Goods Receipt Note**\n\nThis updates your stock levels automatically.', 
'inventory', 9, '["add stock", "stock entry", "receive goods", "goods receipt", "GRN"]'::jsonb, ARRAY['add', 'stock', 'receive', 'goods', 'grn'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('low.*stock|stock.*alert|reorder|out.*stock', 'stock_low', 
E'⚠️ **Low Stock Alert**\n\n**View low stock items:**\n1. Go to **Inventory → Low Stock Report**\n2. See items below reorder level\n\n**Actions:**\n• Create Purchase Order\n• Adjust reorder levels\n• Set up auto-alerts\n\n**Tip:** Configure alerts in Inventory Settings.', 
'inventory', 9, '["low stock", "stock alert", "reorder", "out of stock"]'::jsonb, ARRAY['low', 'stock', 'alert', 'reorder', 'out'])
ON CONFLICT DO NOTHING;

-- REPORTS
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('generate.*report|create.*report|run.*report|show.*report', 'report_generate', 
E'📊 **Generate Reports**\n\n**Available Reports:**\n1. Go to **Reports** section\n2. Select report type:\n   • Sales Report\n   • Attendance Report\n   • Inventory Report\n   • Financial Report\n3. Set date range and filters\n4. Click Generate\n\n**Export Options:** PDF, Excel, CSV', 
'reports', 10, '["generate report", "create report", "run report", "show report"]'::jsonb, ARRAY['generate', 'create', 'run', 'report', 'show'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('sales.*report|revenue.*report|sales.*summary', 'report_sales', 
E'📈 **Sales Report**\n\n**Steps:**\n1. Go to **Reports → Sales Report**\n2. Select date range\n3. Filter by product/customer (optional)\n4. Generate\n\n**Shows:**\n• Total sales\n• Top products\n• Customer-wise breakdown\n• Comparison with previous period', 
'reports', 9, '["sales report", "revenue report", "sales summary"]'::jsonb, ARRAY['sales', 'revenue', 'report', 'summary'])
ON CONFLICT DO NOTHING;

-- NAVIGATION
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('go to|navigate to|open|take me to|show me', 'navigate', 
E'🧭 **Navigation Help**\n\nTell me where you want to go! Examples:\n• "Go to dashboard"\n• "Open leave application"\n• "Navigate to inventory"\n• "Show me reports"\n\n**Main Sections:**\n• Dashboard - Overview\n• HR - Leave, Attendance\n• Tasks - Task management\n• Finance - Invoices, Payments\n• Inventory - Stock management\n• Reports - All reports', 
'navigation', 8, '["go to", "navigate to", "open", "take me to"]'::jsonb, ARRAY['go', 'navigate', 'open', 'show', 'take'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('dashboard|home|main.*page|overview', 'nav_dashboard', 
E'🏠 **Dashboard**\n\nYour dashboard shows:\n• Quick stats (tasks, leaves, approvals)\n• Recent activities\n• Pending items\n• Quick actions\n\n**Go to:** Dashboard (home icon in sidebar)', 
'navigation', 9, '["go to dashboard", "open dashboard", "main page", "home"]'::jsonb, ARRAY['dashboard', 'home', 'main', 'overview'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('settings|preferences|configuration|setup', 'nav_settings', 
E'⚙️ **Settings**\n\n**Access Settings:**\n1. Click gear icon in header\n2. Or go to **Settings** in sidebar\n\n**Available Settings:**\n• Profile settings\n• Notification preferences\n• Theme (dark/light)\n• Language\n• Security (password, 2FA)', 
'navigation', 9, '["settings", "preferences", "configuration", "setup"]'::jsonb, ARRAY['settings', 'preferences', 'config', 'setup'])
ON CONFLICT DO NOTHING;

-- PROFILE & ACCOUNT
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('my.*profile|edit.*profile|update.*profile|view.*profile', 'profile_view', 
E'👤 **Your Profile**\n\n**View/Edit Profile:**\n1. Click your avatar (top right)\n2. Select **My Profile**\n\n**Profile includes:**\n• Personal info\n• Contact details\n• Department & role\n• Leave balance\n• Documents', 
'profile', 9, '["my profile", "edit profile", "update profile", "view profile"]'::jsonb, ARRAY['my', 'profile', 'edit', 'update', 'view'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('change.*password|reset.*password|update.*password|forgot.*password', 'password_change', 
E'🔐 **Change Password**\n\n**Steps:**\n1. Go to **Settings → Security**\n2. Click **Change Password**\n3. Enter current password\n4. Enter new password (twice)\n5. Click Save\n\n**Password requirements:**\n• Minimum 8 characters\n• Include uppercase & lowercase\n• Include numbers', 
'profile', 9, '["change password", "reset password", "update password"]'::jsonb, ARRAY['change', 'reset', 'password', 'update'])
ON CONFLICT DO NOTHING;

-- SUPPORT & ERRORS
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('error|not working|problem|issue|bug|help|stuck', 'report_issue', 
E'🛠️ **Need Help?**\n\nI''m sorry you''re facing an issue!\n\n**Quick fixes:**\n1. Refresh the page\n2. Clear browser cache\n3. Try a different browser\n\n**Still stuck?**\n• Describe what you were trying to do\n• Tell me any error message\n• I''ll help you troubleshoot\n\n**Or contact IT Support** for urgent issues.', 
'support', 8, '["error", "not working", "problem", "issue", "help me"]'::jsonb, ARRAY['error', 'problem', 'issue', 'help', 'stuck', 'bug'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('contact.*support|it.*support|helpdesk|technical.*support', 'contact_support', 
E'📞 **Contact Support**\n\n**IT Helpdesk:**\n• Email: support@company.com\n• Internal extension: 1234\n\n**Before contacting:**\n1. Note the error message\n2. Screenshot the issue\n3. Note what you were doing\n\nI can also help with many issues - just describe the problem!', 
'support', 8, '["contact support", "IT support", "helpdesk", "technical support"]'::jsonb, ARRAY['contact', 'support', 'helpdesk', 'technical'])
ON CONFLICT DO NOTHING;

-- COMMON QUESTIONS
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('what.*time|current.*time|time.*now', 'time_query', 
E'🕐 The current time is shown in the header. I operate in your local timezone as set in your profile.', 
'general', 7, '["what time is it", "current time", "time now"]'::jsonb, ARRAY['time', 'current', 'now'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('today.*date|what.*date|current.*date|date.*today', 'date_query', 
E'📅 Today is {date}. You can see the date in the calendar widget on your dashboard.', 
'general', 7, '["what date is it", "todays date", "current date"]'::jsonb, ARRAY['date', 'today', 'current'])
ON CONFLICT DO NOTHING;

INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords) VALUES
('logout|log out|sign out|exit|close.*session', 'logout', 
E'🚪 **To Logout:**\n1. Click your avatar (top right)\n2. Select **Logout**\n\nOr use the Logout button in the menu.\n\n**Tip:** Always logout from shared computers!', 
'general', 8, '["logout", "log out", "sign out", "exit"]'::jsonb, ARRAY['logout', 'log', 'out', 'sign', 'exit'])
ON CONFLICT DO NOTHING;

-- Update existing data with keywords
UPDATE chat_training_data 
SET keywords = ARRAY['leave', 'apply', 'request'] 
WHERE intent LIKE '%leave%' AND keywords IS NULL;

UPDATE chat_training_data 
SET keywords = ARRAY['task', 'create', 'assign'] 
WHERE intent LIKE '%task%' AND keywords IS NULL;

UPDATE chat_training_data 
SET keywords = ARRAY['attendance', 'punch', 'time'] 
WHERE intent LIKE '%attendance%' AND keywords IS NULL;

-- Show count
SELECT COUNT(*) as total_training_patterns FROM chat_training_data WHERE is_active = true;
