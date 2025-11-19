# 🤖 Copilate Intelligent Chat Agent - Complete Guide

## System Overview

Copilate is now an **intelligent, human-like chat assistant** with:
- ✅ **Advanced spell checking** - Automatically corrects typos
- ✅ **Clarification-first approach** - Asks before guessing
- ✅ **RBAC enforcement** - Permission-aware responses
- ✅ **Self-learning system** - Learns from interactions
- ✅ **Human-like conversation** - Natural, friendly tone
- ✅ **AI-powered NLP** - Context-aware understanding

---

## Core System Prompt

```
You are Copiolate Assistant: a professional, helpful, concise assistant for BISMAN ERP.

BEHAVIOR RULES:
1. Always check RBAC before offering actions
2. If confidence < 0.8, ask clarifying questions
3. Perform intelligent spell checking
4. Be concise, friendly, and human-like
5. Never hallucinate - ask if unsure
6. Respect privacy and permissions

CONFIDENCE LEVELS:
- ≥ 0.90: Confident - proceed with reply
- 0.80-0.89: Medium - suggest and ask confirmation  
- < 0.80: Low - ask clarifying question
```

---

## Intelligent Features

### 1. **Spell Checking & Typo Correction**

**Example 1: Simple Typo**
```
User: "show paymnt requests"
System: Detects typo → "paymnt" = "payment"
Reply: "Hi! 👋 You have 5 payment requests (I corrected 'paymnt' → 'payment'). Would you like to see them?"
```

**Example 2: Multiple Typos**
```
User: "whats my pnding taks"
System: Corrects → "what's my pending tasks"
Reply: "You have 3 pending tasks waiting for approval. Here they are..."
```

**Example 3: Ambiguous Term**
```
User: "show bratualu reports"
System: Unknown term → Ask for clarification
Reply: "I'm not sure what you mean by 'bratualu'. Did you mean:
  A) Brutal (harsh/direct reports)
  B) A specific tool or system name
  C) Something else?
Please clarify so I can help you better."
```

### 2. **Clarification-First Approach**

**Low Confidence Detection:**
```
User: "update thing"
System: Confidence: 0.45 (too low)
Reply: "I'm not sure what you'd like to update. Could you be more specific? For example:
  • Update a payment request
  • Update user information
  • Update inventory
What would you like to do?"
```

**Unknown Term Handling:**
```
User: "run the weekly zephyr"
System: Unknown: "zephyr"
Reply: "I'm not familiar with 'zephyr' in our system. Could you explain what it is or give an example?"
```

**Confirmation Before Action:**
```
User: "delete all pending requests"
System: Confidence: 0.85 (medium)
Reply: "Just to confirm - you want to DELETE all pending payment requests? This will remove [count] requests. Type 'yes' to proceed or 'no' to cancel."
```

### 3. **RBAC (Role-Based Access Control)**

**Permission Check:**
```
User (Employee): "approve all payments"
System: Checks permissions → User lacks 'approve_payments'
Reply: "I don't have permission to approve payments for you. This action requires the 'Payment Approver' role. Please contact an administrator if you need this access."
```

**Permission-Aware Suggestions:**
```
User (Manager): "show dashboard"
System: Checks role → Manager has access
Reply: "Here's your manager dashboard 📊:
  • 12 pending approvals
  • 5 team members active
  • 3 overdue tasks
What would you like to review first?"
```

### 4. **Self-Learning System**

**Learning Flow:**

1. **Unknown Term Detected:**
```
User: "check BISMAN portal status"
System: Unknown: "BISMAN portal"
DB: INSERT INTO unknown_terms (term, occurrences)
```

2. **Create Candidate Reply:**
```
User clarifies: "BISMAN portal is our client dashboard"
System: "Thanks! Shall I remember this for next time? (yes/no)"
User: "yes"
DB: INSERT INTO candidate_responses (term_id, suggested_text, suggested_by)
```

3. **Admin Approval:**
```
Admin reviews candidate reply queue
Admin: APPROVE
DB: UPDATE candidate_responses SET approved = true
DB: INSERT INTO knowledge_base (intent, keywords, reply_template)
```

4. **Production Use:**
```
Next user: "check BISMAN portal status"
System: Now understands → Confident reply ✅
```

---

## Database Schema (PostgreSQL)

```sql
-- Roles & Permissions
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  role_id INT REFERENCES roles(id),
  permission TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  email TEXT,
  role_id INT REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  raw_text TEXT NOT NULL,
  parsed_json JSONB,
  intent TEXT,
  entities JSONB,
  confidence REAL,
  channel_id TEXT,
  session_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

-- Bot Replies
CREATE TABLE bot_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id),
  bot_text TEXT NOT NULL,
  reply_type TEXT, -- 'standard', 'clarifying', 'suggestion', 'error'
  confidence REAL,
  metadata JSONB,
  approved BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Unknown Terms (Learning)
CREATE TABLE unknown_terms (
  id SERIAL PRIMARY KEY,
  term TEXT NOT NULL,
  occurrences INT DEFAULT 1,
  sample_message_id UUID REFERENCES chat_messages(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'learning', 'resolved', 'ignored'
  created_at TIMESTAMP DEFAULT now(),
  last_seen TIMESTAMP DEFAULT now()
);

-- Candidate Responses (Learning Queue)
CREATE TABLE candidate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id INT REFERENCES unknown_terms(id),
  suggested_text TEXT NOT NULL,
  suggested_by UUID REFERENCES users(id),
  context JSONB,
  votes INT DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Knowledge Base
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  reply_template TEXT NOT NULL,
  requires_rbac BOOLEAN DEFAULT false,
  required_permissions TEXT[],
  requires_confirmation BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'custom',
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  last_used TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Learning Events
CREATE TABLE learning_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'unknown_term', 'candidate_created', 'auto_promoted', 'manually_approved'
  candidate_id UUID REFERENCES candidate_responses(id),
  user_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Bot Configuration
CREATE TABLE bot_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT now()
);

-- Metrics
CREATE TABLE bot_metrics (
  id SERIAL PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  total_messages INT DEFAULT 0,
  confident_replies INT DEFAULT 0,
  clarifying_questions INT DEFAULT 0,
  unknown_terms_found INT DEFAULT 0,
  avg_confidence REAL,
  created_at TIMESTAMP DEFAULT now()
);

-- Views for Analytics
CREATE VIEW pending_candidates AS
SELECT 
  c.*,
  u.term,
  u.occurrences,
  us.username as suggested_by_name
FROM candidate_responses c
JOIN unknown_terms u ON c.term_id = u.id
LEFT JOIN users us ON c.suggested_by = us.id
WHERE c.approved = false
ORDER BY c.votes DESC, c.created_at DESC;
```

---

## API Endpoints

### **Chat Endpoints**

#### `POST /api/copilate/message`
Send a message to Copilate

**Request:**
```json
{
  "text": "show my pending tasks",
  "channelId": "optional-channel-id",
  "sessionId": "optional-session-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Hi! 👋 You have 3 pending tasks...",
  "type": "standard",
  "confidence": 0.95,
  "requiresConfirmation": false,
  "metadata": {
    "intent": "show_pending_tasks",
    "spellCorrections": [],
    "aiGenerated": true
  }
}
```

#### `GET /api/copilate/permissions`
Get current user's permissions

**Response:**
```json
{
  "success": true,
  "permissions": [
    "send_message",
    "view_dashboard",
    "create_payment_request"
  ]
}
```

### **Learning Endpoints**

#### `POST /api/copilate/candidate`
Create a candidate response for learning

**Request:**
```json
{
  "termId": 123,
  "suggestedText": "BISMAN portal is the client dashboard",
  "context": { "originalMessage": "check portal status" }
}
```

#### `POST /api/copilate/candidate/:id/vote`
Vote on a candidate response

**Request:**
```json
{
  "voteType": "up", // or "down", "neutral"
  "comment": "This is accurate"
}
```

### **Admin Endpoints**

#### `GET /api/copilate/admin/candidates`
Get pending candidate responses (admin only)

#### `POST /api/copilate/admin/candidates/:id/approve`
Approve a candidate response

**Request:**
```json
{
  "addToKnowledgeBase": true
}
```

#### `GET /api/copilate/admin/unknown-terms`
Get unknown terms for review

#### `GET /api/copilate/admin/metrics`
Get bot performance metrics

#### `POST /api/copilate/admin/knowledge`
Add new knowledge base entry

**Request:**
```json
{
  "intent": "check_portal_status",
  "keywords": ["portal", "status", "BISMAN", "dashboard"],
  "replyTemplate": "The BISMAN client portal is {{status}}. Last updated: {{time}}",
  "requiresRbac": true,
  "requiredPermissions": ["view_client_portal"],
  "requiresConfirmation": false,
  "category": "portal",
  "priority": 5
}
```

---

## Configuration

### Bot Settings (via database)

```sql
-- Confidence thresholds
INSERT INTO bot_config (key, value) VALUES 
  ('confidence_threshold_high', '0.90'),
  ('confidence_threshold_low', '0.80');

-- Auto-learning settings
INSERT INTO bot_config (key, value) VALUES 
  ('auto_promote_enabled', 'false'),
  ('auto_promote_threshold', '5'), -- votes needed
  ('learning_enabled', 'true');

-- RBAC settings
INSERT INTO bot_config (key, value) VALUES 
  ('rbac_enabled', 'true');

-- AI integration
INSERT INTO bot_config (key, value) VALUES 
  ('ai_enabled', 'true'),
  ('ai_server_url', 'http://localhost:8000');
```

---

## Usage Examples

### Example 1: Simple Query
```
User: "show dashboard"
→ Keyword match: high confidence (0.95)
→ Reply: "Here's your dashboard 📊..."
→ Time: 50ms
```

### Example 2: Typo Correction
```
User: "show paymnt requests"
→ Keyword match: low confidence (0.60)
→ AI enhancement: corrects typo (0.95)
→ Reply: "You have 5 payment requests (corrected 'paymnt' → 'payment')..."
→ Time: 2s
```

### Example 3: Unknown Term
```
User: "run zephyr report"
→ Unknown: "zephyr"
→ DB: Save to unknown_terms
→ Reply: "I'm not familiar with 'zephyr'. Could you explain?"
→ User clarifies: "It's our weekly sales report"
→ System: "Thanks! Shall I remember this? (yes/no)"
→ User: "yes"
→ DB: Create candidate response
```

### Example 4: Permission Denied
```
User (Employee): "delete all users"
→ RBAC check: FAIL (lacks 'manage_users')
→ Reply: "I don't have permission to delete users for you. Please contact an administrator."
```

---

## Self-Learning Rules

### Conservative Mode (Default)
- All candidate replies require admin approval
- No automatic promotion
- Safest option

### Auto-Promote Mode (Optional)
- Candidate promoted after N votes (default: 5)
- Only if all votes are positive
- Never auto-promote state-changing actions
- Admin can still override

### Configuration:
```sql
UPDATE bot_config SET value = 'true' WHERE key = 'auto_promote_enabled';
UPDATE bot_config SET value = '5' WHERE key = 'auto_promote_threshold';
```

---

## Monitoring & Metrics

### Daily Metrics
```sql
SELECT * FROM bot_metrics WHERE date = CURRENT_DATE;
```

**Example Output:**
```
total_messages: 150
confident_replies: 120 (80%)
clarifying_questions: 25 (17%)
unknown_terms_found: 5 (3%)
avg_confidence: 0.87
```

### Unknown Terms Dashboard
```sql
SELECT term, occurrences, status, last_seen 
FROM unknown_terms 
WHERE status = 'pending'
ORDER BY occurrences DESC;
```

### Learning Queue
```sql
SELECT * FROM pending_candidates LIMIT 10;
```

---

## Best Practices

### 1. **Spell Checking**
- ✅ Correct obvious typos automatically
- ✅ Note corrections in response
- ✅ Ask for clarification on ambiguous terms
- ❌ Don't assume domain-specific jargon

### 2. **Clarification**
- ✅ Ask short, specific questions
- ✅ Offer 2-3 concrete options
- ✅ Use context from message
- ❌ Don't ask open-ended questions

### 3. **Learning**
- ✅ Save all unknown terms
- ✅ Create candidate responses
- ✅ Require approval for production
- ❌ Don't auto-learn state-changing actions

### 4. **RBAC**
- ✅ Check permissions before every action
- ✅ Explain permission requirements
- ✅ Suggest contacting admin
- ❌ Don't expose unauthorized data

---

## Troubleshooting

### Issue: Too many clarifying questions
**Solution:** Lower confidence threshold or add more keywords to knowledge base

### Issue: Not learning from interactions
**Solution:** Check `learning_enabled` config and database permissions

### Issue: Spell checker too aggressive
**Solution:** Add domain terms to knowledge base or adjust AI prompt

### Issue: Slow responses
**Solution:** Check AI server health, increase confidence threshold

---

## Next Steps

1. ✅ **Test spell checking** - Try various typos
2. ✅ **Review unknown terms** - Check admin dashboard
3. ✅ **Approve candidates** - Process learning queue
4. ✅ **Monitor metrics** - Track confidence trends
5. ✅ **Fine-tune prompts** - Adjust for your domain
6. ✅ **Add knowledge** - Expand knowledge base

---

**Your Copilate is now intelligent, human-like, and ready to learn!** 🚀
