# 🤖 ERP Assistant - How It Works

## 🔄 Interaction Flow

```
USER SENDS MESSAGE
    ↓
"How do I create an invoice?"
    ↓
MATTERMOST SERVER
    ↓
Triggers: MessageHasBeenPosted()
    ↓
ERP ASSISTANT PLUGIN
    ├─ Is it for @erpbot? ✅
    ├─ Analyze: "invoice"
    └─ Generate response
    ↓
POST REPLY
    ↓
USER SEES RESPONSE
"🧾 Invoice Management..."
```

## 📊 Keyword Detection

- **invoice** → Invoice help
- **purchase/po** → Purchase order help
- **leave/attendance** → HR help
- **inventory/stock** → Inventory help
- **help** → Full menu

## 🏗️ Architecture

**Plugin Components:**
1. **OnActivate()** - Creates @erpbot
2. **MessageHasBeenPosted()** - Detects messages
3. **reply()** - Generates responses

**Features:**
- ✅ Stateless (no database)
- ✅ Rule-based (no AI APIs)
- ✅ Instant responses (< 100ms)
- ✅ Zero cost

---

**Built with Mattermost Plugin SDK** 🚀
