# 🎯 Copilate Intelligence Quick Reference

## System Capabilities

| Feature | Status | Description |
|---------|--------|-------------|
| **Spell Checking** | ✅ | Automatically corrects typos (paymnt → payment) |
| **Typo Tolerance** | ✅ | Understands misspelled words |
| **Clarification** | ✅ | Asks before guessing (confidence < 0.8) |
| **RBAC Aware** | ✅ | Respects user permissions |
| **Self-Learning** | ✅ | Learns from interactions (with approval) |
| **Human-like** | ✅ | Natural, conversational tone |
| **AI-Powered** | ✅ | Ollama backend integration |
| **Context-Aware** | ✅ | Remembers conversation context |

---

## Confidence Levels

```
┌─────────────────────────────────────────┐
│  CONFIDENCE SCALE                        │
├─────────────────────────────────────────┤
│  0.90 - 1.00  │  ✅ CONFIDENT            │
│               │  → Proceed with reply    │
│               │  → No confirmation       │
├─────────────────────────────────────────┤
│  0.80 - 0.89  │  ⚠️  MEDIUM             │
│               │  → Suggest action        │
│               │  → Ask confirmation      │
├─────────────────────────────────────────┤
│  0.00 - 0.79  │  ❌ LOW                  │
│               │  → Ask clarifying Q      │
│               │  → Don't proceed         │
└─────────────────────────────────────────┘
```

---

## Spell Checking Examples

```
INPUT                    → OUTPUT
──────────────────────────────────────────────
"paymnt requests"        → "payment requests" ✅
"whats pnding"          → "what's pending" ✅
"bratualu report"       → ASK: "Did you mean...?" ❓
"BISMAN portal"         → CHECK: Known term? 🔍
```

---

## Response Flow

```
USER MESSAGE
    │
    ▼
┌──────────────────┐
│  RBAC CHECK      │ ─── Permission denied? → STOP
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  SPELL CHECK     │ ─── Typos found? → Correct & note
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  NLP ANALYSIS    │ ─── AI enhancement if needed
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  CONFIDENCE?     │
└────────┬─────────┘
         │
    ┌────┼────┐
    │    │    │
  < 0.8 0.8  ≥ 0.9
  0.89
    │    │    │
    ▼    ▼    ▼
  CLARIFY SUGGEST REPLY
```

---

## Common Patterns

### Pattern 1: Simple Query
```
User: "show dashboard"
Bot: "Here's your dashboard 📊..."
Time: ~50ms
AI: Not needed
```

### Pattern 2: Typo
```
User: "show paymnt requests"
Bot: "You have 5 payment requests 
      (corrected: paymnt → payment)..."
Time: ~2s
AI: Used for spell check
```

### Pattern 3: Unknown Term
```
User: "run zephyr"
Bot: "I'm not familiar with 'zephyr'. 
      Could you explain?"
Time: ~1s
DB: Saved to unknown_terms
```

### Pattern 4: Permission Denied
```
User: "delete all users"
Bot: "I don't have permission to do that.
      Please contact an admin."
Time: ~50ms
RBAC: Blocked
```

---

## Learning Process

```
1. UNKNOWN TERM DETECTED
   ↓
2. ASK USER FOR CLARIFICATION
   ↓
3. USER EXPLAINS
   ↓
4. ASK: "Shall I remember this?"
   ↓
5. CREATE CANDIDATE REPLY
   ↓
6. ADMIN REVIEWS & APPROVES
   ↓
7. ADDED TO KNOWLEDGE BASE
   ↓
8. USED IN FUTURE CONVERSATIONS ✅
```

---

## Configuration Commands

```sql
-- Enable/Disable AI
UPDATE bot_config SET value = 'true' WHERE key = 'ai_enabled';

-- Adjust confidence thresholds
UPDATE bot_config SET value = '0.85' WHERE key = 'confidence_threshold_high';

-- Enable auto-learning
UPDATE bot_config SET value = 'true' WHERE key = 'auto_promote_enabled';

-- Set auto-promote threshold
UPDATE bot_config SET value = '5' WHERE key = 'auto_promote_threshold';
```

---

## Quick Diagnostics

```bash
# Check AI server
curl http://localhost:8000/api/ai/health

# Test spell checking
curl -X POST http://localhost:8000/api/copilate/message \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "show paymnt requests"}'

# View unknown terms
psql -d bisman_erp -c "SELECT * FROM unknown_terms WHERE status='pending';"

# Check metrics
psql -d bisman_erp -c "SELECT * FROM bot_metrics WHERE date=CURRENT_DATE;"
```

---

## Admin Tasks

| Task | Command |
|------|---------|
| **View pending candidates** | `GET /api/copilate/admin/candidates` |
| **Approve candidate** | `POST /api/copilate/admin/candidates/:id/approve` |
| **View unknown terms** | `GET /api/copilate/admin/unknown-terms` |
| **Add knowledge** | `POST /api/copilate/admin/knowledge` |
| **View metrics** | `GET /api/copilate/admin/metrics` |

---

## Performance Targets

```
┌────────────────────────────┬──────────┐
│ Metric                     │ Target   │
├────────────────────────────┼──────────┤
│ Simple query response      │ < 100ms  │
│ AI-enhanced query          │ < 3s     │
│ Confidence (avg)           │ > 0.85   │
│ Clarification rate         │ < 20%    │
│ Unknown terms/day          │ < 10     │
│ User satisfaction          │ > 90%    │
└────────────────────────────┴──────────┘
```

---

## Troubleshooting

| Symptom | Solution |
|---------|----------|
| Too many clarifying questions | Lower threshold or add keywords |
| Not learning | Check `learning_enabled` config |
| Slow responses | Check AI server, increase threshold |
| Permission errors | Verify RBAC configuration |
| Typos not corrected | Check AI server health |

---

## Key Files

```
my-backend/
├── src/
│   ├── routes/
│   │   └── copilate.ts          # API endpoints
│   └── services/
│       ├── copilateSmartAgent.ts # Main logic
│       └── aiIntegration.ts      # AI wrapper
└── docs/
    └── COPILATE_INTELLIGENT_CHAT_GUIDE.md
```

---

## Status: ✅ READY

- [x] Spell checking enabled
- [x] AI integration active
- [x] Clarification system ready
- [x] RBAC enforcement on
- [x] Learning system configured
- [x] Human-like responses enabled

**Your chat is now intelligent!** 🚀
