# 🚀 Deploy Mattermost AI Connector to Railway

## Current Status
✅ Running locally on port 3002
⏳ Ready to deploy to Railway

## Deploy to Railway (5 Minutes)

### 1. Deploy the Service
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"
railway up
```

Wait for deployment to complete (~2-3 minutes)

### 2. Get the Railway URL
```bash
railway status
```

Copy the URL (something like: `https://mattermost-ai-production-xxxx.up.railway.app`)

### 3. Set Environment Variables in Railway
```bash
railway variables set MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app
railway variables set MATTERMOST_BOT_TOKEN=1y54w4qe4fg3djq186tixu34uc
railway variables set ERP_API_URL=https://your-backend-url
```

### 4. Create Slash Command in Mattermost

1. **Open Mattermost:** https://mattermost-production-84fd.up.railway.app
2. **Navigate:** Main Menu → Integrations → Slash Commands
3. **Click:** Add Slash Command
4. **Configure:**
   - **Command Trigger Word:** `ai`
   - **Request URL:** `https://your-ai-connector-url/mattermost/command`
   - **Request Method:** POST
   - **Description:** "Ask the AI assistant"
   - **Autocomplete:** Yes
   - **Autocomplete Hint:** `[your question]`
   - **Autocomplete Description:** "Ask AI about ERP tasks"
5. **Click:** Save
6. **Copy the Token** shown

### 5. Update Bot Token
```bash
railway variables set MATTERMOST_COMMAND_TOKEN=<token-from-step-4>
```

### 6. Test!

In any Mattermost channel:
```
/ai How do I process a refund?
/ai What are the steps to create a new vendor?
/ai Help with inventory management
```

## 🎯 Difference Between Plugin and AI Connector

### @erpbot (Plugin) - Navigation Guide
- Fast, rule-based responses
- Shows where to find features
- Works in DMs and @mentions
- Example: "Navigate to Finance → Invoices"

### /ai command (Connector) - Detailed Explanations
- Can call your ERP API
- Provides step-by-step instructions
- Uses Ollama for complex queries
- Example: "Here are the 5 steps to process a refund..."

## 💡 Use Both Together!

- **Quick navigation?** → Ask @erpbot
- **Detailed steps?** → Use /ai command

---

**Deploy when ready!** 🚀
