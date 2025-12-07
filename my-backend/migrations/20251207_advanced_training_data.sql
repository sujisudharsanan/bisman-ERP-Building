-- =====================================================
-- ADVANCED ERP TRAINING DATA
-- =====================================================
-- Comprehensive entity types, intent flows, and 
-- enhanced training patterns for BISMAN ERP
-- =====================================================

-- 1. ENTITY TYPES FOR ERP
INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
-- Date entities
('leave_type', 'list', ARRAY[]::TEXT[], 
 '{"casual": "Casual Leave", "sick": "Sick Leave", "earned": "Earned Leave", "privilege": "Privilege Leave", "maternity": "Maternity Leave", "paternity": "Paternity Leave", "compensatory": "Compensatory Off", "lop": "Loss of Pay"}',
 '{"cl": "casual", "sl": "sick", "el": "earned", "pl": "privilege", "ml": "maternity", "comp off": "compensatory"}',
 'Types of leave available in the system',
 ARRAY['casual leave', 'sick leave', 'earned leave', 'CL', 'SL'])
ON CONFLICT (entity_name) DO UPDATE SET values = EXCLUDED.values, synonyms = EXCLUDED.synonyms;

INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
('department', 'list', ARRAY[]::TEXT[],
 '{"hr": "Human Resources", "finance": "Finance & Accounts", "sales": "Sales", "marketing": "Marketing", "operations": "Operations", "it": "Information Technology", "admin": "Administration", "purchase": "Purchase", "inventory": "Inventory", "logistics": "Logistics"}',
 '{"human resources": "hr", "accounts": "finance", "tech": "it", "stores": "inventory"}',
 'Department names in the organization',
 ARRAY['HR', 'Finance', 'Sales', 'IT'])
ON CONFLICT (entity_name) DO UPDATE SET values = EXCLUDED.values;

INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
('document_type', 'list', ARRAY[]::TEXT[],
 '{"invoice": "Invoice", "po": "Purchase Order", "so": "Sales Order", "grn": "Goods Receipt Note", "dc": "Delivery Challan", "quotation": "Quotation", "receipt": "Receipt", "voucher": "Voucher", "bill": "Bill", "memo": "Memo"}',
 '{"purchase order": "po", "sales order": "so", "goods receipt": "grn", "delivery note": "dc"}',
 'Types of documents in ERP',
 ARRAY['invoice', 'PO', 'GRN', 'quotation'])
ON CONFLICT (entity_name) DO UPDATE SET values = EXCLUDED.values;

INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
('status', 'list', ARRAY[]::TEXT[],
 '{"pending": "Pending", "approved": "Approved", "rejected": "Rejected", "completed": "Completed", "cancelled": "Cancelled", "in_progress": "In Progress", "draft": "Draft", "submitted": "Submitted", "on_hold": "On Hold"}',
 '{"done": "completed", "cancel": "cancelled", "hold": "on_hold", "processing": "in_progress"}',
 'Common status values',
 ARRAY['pending', 'approved', 'rejected'])
ON CONFLICT (entity_name) DO UPDATE SET values = EXCLUDED.values;

INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
('time_period', 'regex', 
 ARRAY['today', 'yesterday', 'this week', 'last week', 'this month', 'last month', 'this year', 'last year', '\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}', 'last \d+ days'],
 '{}',
 '{"current week": "this week", "current month": "this month", "previous month": "last month"}',
 'Time period expressions',
 ARRAY['today', 'yesterday', 'last 7 days', 'this month'])
ON CONFLICT (entity_name) DO UPDATE SET patterns = EXCLUDED.patterns;

INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
('currency', 'regex',
 ARRAY['₹\s*[\d,]+(\.\d{2})?', 'Rs\.?\s*[\d,]+(\.\d{2})?', 'INR\s*[\d,]+(\.\d{2})?', '\$\s*[\d,]+(\.\d{2})?', 'USD\s*[\d,]+(\.\d{2})?'],
 '{}',
 '{"rupees": "₹", "dollars": "$", "rs": "₹"}',
 'Currency amount patterns',
 ARRAY['₹10,000', 'Rs. 5000', '$100'])
ON CONFLICT (entity_name) DO UPDATE SET patterns = EXCLUDED.patterns;

INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
('quantity', 'regex',
 ARRAY['\d+\s*(pieces?|pcs?|units?|nos?|items?|qty)', '\d+\s*(kg|kgs?|grams?|g|tons?|tonnes?)', '\d+\s*(liters?|ltrs?|l|ml|gallons?)', '\d+\s*(meters?|m|feet|ft|inches|in)'],
 '{}',
 '{"piece": "pcs", "number": "nos", "kilogram": "kg", "liter": "ltr"}',
 'Quantity expressions with units',
 ARRAY['10 pieces', '50 kg', '100 units'])
ON CONFLICT (entity_name) DO UPDATE SET patterns = EXCLUDED.patterns;

INSERT INTO chat_entity_types (entity_name, entity_type, patterns, values, synonyms, description, examples) VALUES
('approval_action', 'list', ARRAY[]::TEXT[],
 '{"approve": "Approve", "reject": "Reject", "hold": "Put on Hold", "forward": "Forward", "return": "Return for Correction", "escalate": "Escalate"}',
 '{"accept": "approve", "decline": "reject", "pass": "forward", "send back": "return"}',
 'Approval workflow actions',
 ARRAY['approve', 'reject', 'forward'])
ON CONFLICT (entity_name) DO UPDATE SET values = EXCLUDED.values;

-- 2. INTENT FLOWS (Conversation Flows)
INSERT INTO chat_intent_flows (from_intent, to_intent, trigger_condition, probability, context_update) VALUES
-- Leave application flow
('leave_apply', 'leave_dates', '{"slot_missing": "dates"}', 0.9, '{"flow": "leave_application"}'),
('leave_dates', 'leave_reason', '{"slot_missing": "reason"}', 0.8, '{}'),
('leave_reason', 'leave_confirm', '{"all_slots_filled": true}', 0.95, '{}'),
('leave_confirm', 'leave_submitted', '{"user_confirms": true}', 0.9, '{"completed": true}')
ON CONFLICT (from_intent, to_intent) DO UPDATE SET probability = EXCLUDED.probability;

INSERT INTO chat_intent_flows (from_intent, to_intent, trigger_condition, probability, context_update) VALUES
-- Task creation flow
('task_create', 'task_title', '{"slot_missing": "title"}', 0.9, '{"flow": "task_creation"}'),
('task_title', 'task_assignee', '{"slot_missing": "assignee"}', 0.8, '{}'),
('task_assignee', 'task_due_date', '{"slot_missing": "due_date"}', 0.7, '{}'),
('task_due_date', 'task_priority', '{"slot_missing": "priority"}', 0.6, '{}'),
('task_priority', 'task_confirm', '{"all_slots_filled": true}', 0.95, '{}')
ON CONFLICT (from_intent, to_intent) DO UPDATE SET probability = EXCLUDED.probability;

INSERT INTO chat_intent_flows (from_intent, to_intent, trigger_condition, probability, context_update) VALUES
-- Invoice creation flow
('invoice_create', 'invoice_customer', '{"slot_missing": "customer"}', 0.9, '{"flow": "invoice_creation"}'),
('invoice_customer', 'invoice_items', '{"slot_missing": "items"}', 0.9, '{}'),
('invoice_items', 'invoice_confirm', '{"all_slots_filled": true}', 0.95, '{}')
ON CONFLICT (from_intent, to_intent) DO UPDATE SET probability = EXCLUDED.probability;

INSERT INTO chat_intent_flows (from_intent, to_intent, trigger_condition, probability, context_update) VALUES
-- Report flow
('report_request', 'report_type', '{"slot_missing": "report_type"}', 0.9, '{"flow": "reporting"}'),
('report_type', 'report_period', '{"slot_missing": "period"}', 0.8, '{}'),
('report_period', 'report_generate', '{"all_slots_filled": true}', 0.95, '{}')
ON CONFLICT (from_intent, to_intent) DO UPDATE SET probability = EXCLUDED.probability;

-- 3. CONTEXT SLOTS (for slot filling)
INSERT INTO chat_context_slots (intent, slot_name, slot_type, entity_type, is_required, prompt_message, order_priority) VALUES
-- Leave application slots
('leave_apply', 'leave_type', 'entity', 'leave_type', true, 'What type of leave would you like to apply for? (Casual, Sick, Earned, etc.)', 1),
('leave_apply', 'from_date', 'date', 'time_period', true, 'From which date do you need leave?', 2),
('leave_apply', 'to_date', 'date', 'time_period', true, 'Until which date?', 3),
('leave_apply', 'reason', 'text', NULL, true, 'Please provide a brief reason for your leave:', 4)
ON CONFLICT (intent, slot_name) DO UPDATE SET prompt_message = EXCLUDED.prompt_message;

INSERT INTO chat_context_slots (intent, slot_name, slot_type, entity_type, is_required, prompt_message, order_priority) VALUES
-- Task creation slots
('task_create', 'title', 'text', NULL, true, 'What is the title of the task?', 1),
('task_create', 'description', 'text', NULL, false, 'Any additional details for the task?', 2),
('task_create', 'assignee', 'text', NULL, true, 'Who should this task be assigned to?', 3),
('task_create', 'due_date', 'date', 'time_period', true, 'When is the deadline?', 4),
('task_create', 'priority', 'list', NULL, false, 'What priority? (High, Medium, Low)', 5)
ON CONFLICT (intent, slot_name) DO UPDATE SET prompt_message = EXCLUDED.prompt_message;

INSERT INTO chat_context_slots (intent, slot_name, slot_type, entity_type, is_required, prompt_message, order_priority) VALUES
-- Invoice slots
('invoice_create', 'customer', 'text', NULL, true, 'Which customer is this invoice for?', 1),
('invoice_create', 'items', 'text', NULL, true, 'What items should be included in the invoice?', 2),
('invoice_create', 'due_date', 'date', 'time_period', false, 'Payment due date?', 3)
ON CONFLICT (intent, slot_name) DO UPDATE SET prompt_message = EXCLUDED.prompt_message;

-- 4. ENHANCED TRAINING DATA with keywords and examples
UPDATE chat_training_data SET 
    keywords = ARRAY['leave', 'apply', 'request', 'time off', 'vacation', 'holiday', 'absent'],
    examples = ARRAY['I want to apply for leave', 'how do i request leave', 'need some time off', 'want to take vacation', 'apply for CL', 'request sick leave'],
    follow_up_intents = ARRAY['leave_dates', 'leave_balance', 'leave_status'],
    difficulty_level = 'easy',
    tags = ARRAY['hr', 'leave', 'self-service']
WHERE intent LIKE '%leave%' AND intent NOT LIKE '%balance%';

UPDATE chat_training_data SET 
    keywords = ARRAY['task', 'create', 'assign', 'new', 'add', 'todo', 'work'],
    examples = ARRAY['create a new task', 'add a task for someone', 'assign work to team', 'new todo item', 'make a task'],
    follow_up_intents = ARRAY['task_title', 'task_list'],
    difficulty_level = 'easy',
    tags = ARRAY['tasks', 'productivity']
WHERE intent LIKE '%task%create%' OR intent = 'create_task';

UPDATE chat_training_data SET 
    keywords = ARRAY['invoice', 'bill', 'sales', 'create', 'generate', 'make'],
    examples = ARRAY['create an invoice', 'generate a bill', 'new invoice for customer', 'make a sales invoice'],
    follow_up_intents = ARRAY['invoice_customer', 'invoice_list'],
    difficulty_level = 'medium',
    tags = ARRAY['sales', 'finance', 'billing']
WHERE intent LIKE '%invoice%' AND pattern LIKE '%create%';

UPDATE chat_training_data SET 
    keywords = ARRAY['report', 'generate', 'analytics', 'data', 'summary', 'statistics'],
    examples = ARRAY['generate a report', 'show me analytics', 'I need a summary', 'get statistics', 'export data'],
    follow_up_intents = ARRAY['report_type', 'report_period'],
    difficulty_level = 'medium',
    tags = ARRAY['reports', 'analytics']
WHERE intent LIKE '%report%';

UPDATE chat_training_data SET 
    keywords = ARRAY['attendance', 'punch', 'check in', 'clock', 'time', 'present'],
    examples = ARRAY['mark my attendance', 'punch in', 'check in to work', 'clock in', 'mark me present'],
    difficulty_level = 'easy',
    tags = ARRAY['hr', 'attendance', 'time']
WHERE intent LIKE '%attendance%' OR pattern LIKE '%punch%' OR pattern LIKE '%check.?in%';

UPDATE chat_training_data SET 
    keywords = ARRAY['approval', 'approve', 'pending', 'review', 'authorize'],
    examples = ARRAY['show my pending approvals', 'what needs my approval', 'approve requests', 'pending for authorization'],
    follow_up_intents = ARRAY['approval_action'],
    difficulty_level = 'easy',
    tags = ARRAY['approvals', 'workflow']
WHERE intent LIKE '%approv%';

-- 5. ADD MORE COMPREHENSIVE TRAINING PATTERNS
-- Navigation intents
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('go to|navigate|open|show me|take me to', 'navigation', 'I can help you navigate! Where would you like to go? You can say things like "go to dashboard", "open inventory", or "show me sales"', 'navigation', 8,
 ARRAY['go to dashboard', 'open settings', 'navigate to sales', 'take me to reports'],
 ARRAY['go', 'navigate', 'open', 'show', 'take'],
 ARRAY['navigation', 'ui'])
ON CONFLICT DO NOTHING;

-- Calculation intents  
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('calculate|compute|what is|sum|total|add|subtract|multiply|divide', 'calculation', 'Let me calculate that for you...', 'utility', 9,
 ARRAY['what is 5 + 3', 'calculate 100 * 2', 'sum of 10 and 20', 'add 50 to 100'],
 ARRAY['calculate', 'compute', 'sum', 'total', 'math'],
 ARRAY['utility', 'math'])
ON CONFLICT DO NOTHING;

-- Status check intents
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('status|track|where is|what happened to|update on', 'status_check', 'I can help you check the status. Please provide more details like the order number, task ID, or request type.', 'general', 7,
 ARRAY['what is the status of my order', 'track my request', 'where is my invoice', 'update on leave request'],
 ARRAY['status', 'track', 'where', 'update', 'check'],
 ARRAY['status', 'tracking'])
ON CONFLICT DO NOTHING;

-- Help with errors
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('error|not working|issue|problem|bug|failed|stuck', 'report_issue', '😔 I''m sorry you''re facing an issue!\n\nTo help you better, please:\n1. Describe what you were trying to do\n2. Tell me the error message (if any)\n3. Which page/module were you on?\n\nOr you can contact IT support directly.', 'support', 8,
 ARRAY['getting an error', 'page not working', 'facing an issue', 'system is stuck', 'something failed'],
 ARRAY['error', 'issue', 'problem', 'bug', 'fail', 'stuck', 'broken'],
 ARRAY['support', 'help', 'troubleshoot'])
ON CONFLICT DO NOTHING;

-- Quick actions
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('quick|fast|shortcut|speed|immediately', 'quick_actions', '⚡ **Quick Actions Available:**\n\n• 📋 "new task" - Create a task\n• 📝 "apply leave" - Request leave\n• ✅ "my approvals" - View pending approvals\n• 📊 "today''s summary" - Daily overview\n• 👤 "my profile" - View your profile\n\nWhat would you like to do?', 'navigation', 7,
 ARRAY['quick actions', 'fast access', 'shortcuts', 'speed up work'],
 ARRAY['quick', 'fast', 'shortcut', 'speed'],
 ARRAY['productivity', 'navigation'])
ON CONFLICT DO NOTHING;

-- Daily summary
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('today|daily|morning|summary|overview|briefing', 'daily_summary', '📅 **Good day! Here''s your summary:**\n\nI can show you:\n• 📋 Tasks due today\n• 📩 Pending approvals\n• 📊 Key metrics\n• 🗓️ Upcoming meetings\n\nWhat would you like to see first?', 'general', 7,
 ARRAY['today''s summary', 'daily briefing', 'morning update', 'what''s on my plate today'],
 ARRAY['today', 'daily', 'summary', 'morning', 'overview'],
 ARRAY['productivity', 'dashboard'])
ON CONFLICT DO NOTHING;

-- Inventory queries
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('stock|inventory|warehouse|available|quantity|items in|how many', 'inventory_query', '📦 **Inventory Query**\n\nI can help you check:\n• Current stock levels\n• Item availability\n• Low stock alerts\n• Warehouse details\n\nPlease specify the item name or code.', 'inventory', 7,
 ARRAY['check stock', 'how many items available', 'inventory status', 'warehouse stock'],
 ARRAY['stock', 'inventory', 'warehouse', 'quantity', 'available'],
 ARRAY['inventory', 'warehouse', 'stock'])
ON CONFLICT DO NOTHING;

-- Sales queries  
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('sales|revenue|orders|customers|deals|pipeline', 'sales_query', '💰 **Sales Information**\n\nI can help with:\n• Today''s sales\n• Order status\n• Customer details\n• Sales pipeline\n• Revenue reports\n\nWhat would you like to know?', 'sales', 7,
 ARRAY['today''s sales', 'show orders', 'customer list', 'sales pipeline', 'revenue this month'],
 ARRAY['sales', 'revenue', 'orders', 'customers', 'deals'],
 ARRAY['sales', 'crm', 'revenue'])
ON CONFLICT DO NOTHING;

-- Finance queries
INSERT INTO chat_training_data (pattern, intent, response_template, category, priority, examples, keywords, tags) VALUES
('payment|expense|balance|ledger|accounts|receivable|payable', 'finance_query', '💵 **Finance Query**\n\nI can help with:\n• Payment status\n• Outstanding balances\n• Expense reports\n• Account statements\n• Receivables/Payables\n\nPlease specify what you need.', 'finance', 7,
 ARRAY['payment status', 'outstanding balance', 'expense report', 'accounts receivable'],
 ARRAY['payment', 'expense', 'balance', 'accounts', 'ledger'],
 ARRAY['finance', 'accounts', 'payments'])
ON CONFLICT DO NOTHING;

-- 6. RESPONSE VARIANTS FOR A/B TESTING
INSERT INTO chat_response_variants (training_data_id, variant_name, response_template, weight) 
SELECT id, 'formal', 
'I understand you would like to apply for leave. Please provide the following details:
1. Type of leave
2. Start date
3. End date
4. Reason for leave

You can also navigate to HR > Leave Application for a detailed form.',
0.5
FROM chat_training_data WHERE intent = 'leave_apply' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO chat_response_variants (training_data_id, variant_name, response_template, weight)
SELECT id, 'casual',
'Sure thing! 🏖️ Let''s get your leave sorted!

Quick questions:
• What type - Casual, Sick, or Earned?
• When do you need off?
• How many days?

Or just tell me like: "I need 2 days casual leave from Monday"',
0.5
FROM chat_training_data WHERE intent = 'leave_apply' LIMIT 1
ON CONFLICT DO NOTHING;

SELECT 'Advanced Training Data Loaded Successfully!' as status,
       (SELECT COUNT(*) FROM chat_entity_types) as entity_types,
       (SELECT COUNT(*) FROM chat_intent_flows) as intent_flows,
       (SELECT COUNT(*) FROM chat_context_slots) as context_slots,
       (SELECT COUNT(*) FROM chat_training_data) as training_patterns;
