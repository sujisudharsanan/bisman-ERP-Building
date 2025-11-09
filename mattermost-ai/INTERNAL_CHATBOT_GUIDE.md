# 🤖 Mattermost Internal Chatbot - No External APIs!

## ✅ What Changed

I've removed the OpenAI API integration and created an **internal chatbot** that uses:

1. **Your ERP's AI endpoint** (`/api/ai/chat`) - First priority
2. **Local Ollama** - Fallback if ERP AI unavailable
3. **Simple rule-based responses** - Basic fallback for common questions

**No external API costs! Everything runs internally!** 💰✅

---

## 🏗️ Architecture

```
User in Mattermost
    ↓
/ai command
    ↓
Internal AI Connector (Railway)
    ↓
├─→ Try ERP API (/api/ai/chat)
│   ✅ Use ERP's AI if available
│
├─→ Fallback to Ollama
│   ✅ Use local LLM if ERP unavailable
│
└─→ Simple rule-based
    ✅ Basic responses for common questions
```

---

## 🎯 How It Works

### Priority 1: Your ERP AI Endpoint

The bot first tries to call your ERP's existing AI endpoint:
```javascript
POST http://localhost:3001/api/ai/chat
{
  "message": "What is ERP?",
  "context": {
    "user": "john",
    "channel": "channel-id"
  }
}
```

If your ERP responds, it uses that answer! ✅

### Priority 2: Local Ollama

If ERP AI is unavailable, it uses Ollama:
```bash
# Make sure Ollama is running
ollama serve

# It will use tinyllama model
ollama pull tinyllama
```

### Priority 3: Rule-Based Fallback

For basic questions:
- "hello" → Greeting
- "help" → List capabilities
- "erp" → Explain ERP

---

## 🚀 Quick Setup

### Step 1: Update Environment (Already Done!)

`.env` now configured for internal use:
```env
# No OpenAI needed! ✅
ERP_API_URL=http://localhost:3001
OLLAMA_URL=http://localhost:11434
MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app
MATTERMOST_BOT_TOKEN=1y54w4qe4fg3djq186tixu34uc
```

### Step 2: Deploy to Railway

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"
railway up
```

### Step 3: Set Railway Environment Variables

```bash
railway variables set MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app
railway variables set MATTERMOST_BOT_TOKEN=1y54w4qe4fg3djq186tixu34uc
railway variables set ERP_API_URL=https://your-erp-backend-url
railway variables set OLLAMA_URL=http://localhost:11434
```

### Step 4: Create Bot & Slash Command in Mattermost

Same as before:
1. Create bot account: `@ai-assistant`
2. Create slash command: `/ai`
3. Set command token in Railway

---

## 💡 Integration with Your ERP

### Option A: Use Existing AI Endpoint

If you already have `/api/ai/chat` in your backend:
```javascript
// Already configured! Just make sure it returns:
{
  "response": "Your AI answer here",
  // or
  "message": "Your AI answer here",
  // or
  "text": "Your AI answer here"
}
```

### Option B: Create New AI Endpoint

Add to your backend (`my-backend`):

```javascript
// In my-backend/routes/ai.js
app.post('/api/ai/chat', async (req, res) => {
  const { message, context } = req.body;
  
  // Your AI logic here
  // Could use Ollama, local model, or custom logic
  
  const response = await yourAIFunction(message, context);
  
  res.json({ response });
});
```

### Option C: Just Use Ollama

If you don't want a custom ERP endpoint, that's fine!  
The bot will automatically use Ollama as the AI engine.

```bash
# Install Ollama
brew install ollama

# Pull model
ollama pull tinyllama

# Run
ollama serve
```

---

## 🔧 Customization

### Add Your Own Response Logic

Edit `server.js` → `getSimpleFallbackResponse()`:

```javascript
function getSimpleFallbackResponse(prompt) {
  const lower = prompt.toLowerCase();
  
  // Sales questions
  if (lower.includes('sales order') || lower.includes('quotation')) {
    return "To create a sales order, go to Sales → Orders → New...";
  }
  
  // Inventory questions
  if (lower.includes('stock') || lower.includes('inventory')) {
    return "Check inventory at Inventory → Stock Levels...";
  }
  
  // Custom for your business
  if (lower.includes('your-specific-term')) {
    return "Your custom response here";
  }
  
  return "I'm your internal ERP assistant...";
}
```

### Connect to Database

Add database queries:

```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function callInternalAI(prompt, context) {
  // Check if question is about users
  if (prompt.toLowerCase().includes('users')) {
    const userCount = await prisma.user.count();
    return `We have ${userCount} users in the system.`;
  }
  
  // Check if question is about orders
  if (prompt.toLowerCase().includes('pending orders')) {
    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' }
    });
    return `There are ${pendingOrders} pending orders.`;
  }
  
  // Continue with AI...
}
```

---

## 💰 Cost Comparison

| Solution | Monthly Cost |
|----------|--------------|
| **OpenAI (removed)** | $0.15 - $15/month |
| **Internal (new)** | $0 (free!) |
| **Ollama** | $0 (runs locally) |
| **Railway hosting** | $0 - $5 (free tier usually enough) |

**Total: Essentially free!** ✅

---

## 🎨 Example Responses

### With ERP Integration:
```
User: /ai How many pending orders do we have?

🤖 ERP Assistant:
You have 23 pending orders:
- Sales Orders: 15
- Purchase Orders: 8

Most recent: SO-2025-001 from ABC Corp
```

### With Ollama:
```
User: /ai What is lean manufacturing?

🤖 ERP Assistant:
Lean manufacturing is a production methodology focused on minimizing waste 
while maximizing productivity. Key principles include just-in-time 
production, continuous improvement (Kaizen), and value stream mapping.
```

### Simple Fallback:
```
User: /ai help

🤖 ERP Assistant:
I can assist you with:
• Sales Orders & Quotations
• Inventory Management
• Purchase Orders
• Financial Reports
• User Management

Just ask me a specific question!
```

---

## 🔄 Next Steps

### Immediate:
1. ✅ OpenAI removed
2. ✅ Internal AI configured
3. 🔲 Deploy to Railway
4. 🔲 Create bot & slash command
5. 🔲 Test with `/ai`

### Future Enhancements:
- Connect to your ERP database
- Add custom business logic
- Integrate with existing AI modules
- Add conversation memory
- Support file uploads
- Multi-language support

---

## 🐛 Troubleshooting

### Bot uses fallback responses only:
```bash
# Check if ERP API is accessible
curl http://localhost:3001/api/ai/chat -d '{"message":"test"}'

# Check if Ollama is running
curl http://localhost:11434/api/generate
```

### ERP API not responding:
- Make sure your backend is running
- Check the endpoint path is correct
- Verify CORS settings if needed
- Check Railway logs

### Ollama not working:
```bash
# Install
brew install ollama

# Pull model
ollama pull tinyllama

# Start server
ollama serve
```

---

## ✅ Summary

### What You Have Now:

**Before (OpenAI):**
- ❌ External API dependency
- ❌ Monthly costs ($0.15-$15)
- ❌ Privacy concerns (data sent to OpenAI)
- ❌ Internet dependency

**After (Internal):**
- ✅ Fully internal/private
- ✅ No recurring costs
- ✅ Uses your ERP's AI
- ✅ Ollama fallback
- ✅ Complete control

### Ready to Deploy:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"
railway up
```

Then create bot & slash command in Mattermost!

**Your internal chatbot is ready!** 🤖✨

---

**No OpenAI, no external APIs, completely internal!** 🎉
