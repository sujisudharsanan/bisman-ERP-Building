# 🤖 Mattermost AI Connector

AI-powered chat assistant for your Mattermost server using OpenAI (with Ollama fallback).

## 🎯 Features

- ✅ `/ai` slash command in Mattermost
- 🤖 Powered by OpenAI GPT-4o-mini
- 🔄 Fallback to local Ollama if OpenAI unavailable
- 📡 Easy Railway deployment
- 💬 Channel-based responses
- 🔒 Token-based security

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"
npm install
```

### 2. Configure Environment Variables

Edit `.env` file:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-actual-openai-key

# Required: Mattermost Bot Token (from Bot Accounts)
MATTERMOST_BOT_TOKEN=your-bot-token-here

# Required: Slash Command Token (from Slash Commands)
MATTERMOST_COMMAND_TOKEN=your-command-token-here

# Your Mattermost URL
MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app

# Server Port
PORT=3000
```

### 3. Test Locally

```bash
npm start
```

Server runs at: `http://localhost:3000`

Check health: `curl http://localhost:3000/health`

---

## 🌐 Deploy to Railway

### Option A: Automatic Deployment

```bash
cd "/Users/abhi/Desktop/BISMAN EP/mattermost-ai"
railway up
```

### Option B: Connect GitHub Repo

1. Push to GitHub
2. Connect repo in Railway
3. Deploy automatically

### Set Environment Variables in Railway:

```
OPENAI_API_KEY=sk-...
MATTERMOST_BOT_TOKEN=...
MATTERMOST_COMMAND_TOKEN=...
MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app
PORT=3000
```

---

## ⚙️ Mattermost Configuration

### Step 1: Create Bot Account

1. Login to Mattermost as admin
2. Go to: **Main Menu → Integrations → Bot Accounts**
3. Click **"Add Bot Account"**
4. Fill in:
   - **Username:** `ai-assistant`
   - **Display Name:** `AI Assistant`
   - **Description:** `AI-powered chat assistant`
   - **Role:** `Member` or `System Admin`
5. Click **"Create Bot Account"**
6. **Copy the Bot Access Token** → Use as `MATTERMOST_BOT_TOKEN`

### Step 2: Create Slash Command

1. Go to: **Main Menu → Integrations → Slash Commands**
2. Click **"Add Slash Command"**
3. Fill in:
   - **Title:** `AI Assistant`
   - **Description:** `Ask questions to AI assistant`
   - **Command Trigger Word:** `ai`
   - **Request URL:** `https://your-railway-app.up.railway.app/mattermost/command`
   - **Request Method:** `POST`
   - **Response Username:** `AI Assistant` (optional)
   - **Response Icon:** (optional, upload bot icon)
4. Click **"Save"**
5. **Copy the Token** → Use as `MATTERMOST_COMMAND_TOKEN`

### Step 3: Add Bot to Channels

1. Go to any channel
2. Click channel name → **Add Members**
3. Search for `@ai-assistant`
4. Add the bot to the channel

---

## 💬 Usage

### In any Mattermost channel where the bot is added:

```
/ai What is ERP?
/ai How do I create a sales order?
/ai Explain inventory management
/ai What are the benefits of cloud ERP?
```

### Response Format:

```
@username asked:
> What is ERP?

🤖 AI Assistant:
ERP (Enterprise Resource Planning) is a type of software that organizations 
use to manage day-to-day business activities such as accounting, procurement, 
project management, and manufacturing...
```

---

## 🔧 API Endpoints

### POST `/mattermost/command`
Slash command endpoint for `/ai` commands

**Request (from Mattermost):**
```
token=xxx
text=What is ERP?
channel_id=xxx
user_name=john
```

**Response:**
```json
{
  "response_type": "ephemeral",
  "text": "🤔 Thinking..."
}
```

### POST `/mattermost/webhook`
Webhook endpoint for interactive messages

### GET `/health`
Health check endpoint

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-11-09T...",
  "service": "mattermost-ai",
  "config": {
    "openai": true,
    "mattermost_url": "https://...",
    "bot_token": true,
    "command_token": true
  }
}
```

### GET `/`
Root endpoint with service info

---

## 🔐 Security

### Token Verification:
- All slash commands verified with `MATTERMOST_COMMAND_TOKEN`
- Bot uses dedicated access token
- Tokens never exposed in responses

### Best Practices:
1. **Keep `.env` file secret** - Never commit to git
2. **Use Railway Variables** - For production deployment
3. **Rotate tokens regularly** - Generate new tokens every 90 days
4. **Limit bot permissions** - Only grant necessary access
5. **Monitor API usage** - Watch OpenAI usage dashboard

---

## 🐛 Troubleshooting

### Bot not responding:
```bash
# Check health endpoint
curl https://your-app.up.railway.app/health

# Verify bot token
# Check Railway logs
railway logs
```

### "Unauthorized" error:
- Verify `MATTERMOST_COMMAND_TOKEN` matches slash command token
- Check bot is added to the channel

### OpenAI errors:
- Verify `OPENAI_API_KEY` is valid
- Check OpenAI quota/billing
- Falls back to Ollama if OpenAI fails

### Bot posts not appearing:
- Ensure bot is added to the channel
- Verify `MATTERMOST_BOT_TOKEN` is correct
- Check bot has posting permissions

---

## 📊 Monitoring

### Check Logs:

**Local:**
```bash
npm start
# Watch console output
```

**Railway:**
```bash
railway logs --tail 100
```

### Health Check:
```bash
curl https://your-app.up.railway.app/health
```

### Test Command:
In Mattermost: `/ai hello`

---

## 🎨 Customization

### Change AI Model:

Edit `server.js`:
```javascript
model: "gpt-4",  // Use GPT-4 instead of gpt-4o-mini
max_tokens: 1000,  // Longer responses
```

### Custom System Prompt:

```javascript
{ 
  role: "system", 
  content: "You are an expert in manufacturing ERP systems. Focus on supply chain and production planning." 
}
```

### Response Format:

```javascript
const formattedMessage = `🤖 **AI Says:**\n${answer}`;
```

---

## 📈 Cost Estimation

### OpenAI Pricing (gpt-4o-mini):
- **Input:** $0.150 per 1M tokens
- **Output:** $0.600 per 1M tokens

### Typical Usage:
- Average question: ~50 tokens
- Average response: ~200 tokens
- **Cost per query:** ~$0.00015 (very cheap!)

### Monthly Estimates:
- 1,000 queries/month: ~$0.15
- 10,000 queries/month: ~$1.50
- 100,000 queries/month: ~$15

**Very affordable for team use!** ✅

---

## 🔄 Fallback to Ollama

If OpenAI is unavailable, the bot automatically falls back to local Ollama:

```env
OLLAMA_URL=http://localhost:11434
```

Install Ollama:
```bash
brew install ollama
ollama pull tinyllama
ollama serve
```

---

## 📚 Documentation

### Mattermost Integration Docs:
- Bot Accounts: https://docs.mattermost.com/developer/bot-accounts.html
- Slash Commands: https://docs.mattermost.com/developer/slash-commands.html
- API Reference: https://api.mattermost.com/

### OpenAI Docs:
- API Reference: https://platform.openai.com/docs/api-reference
- Chat Completions: https://platform.openai.com/docs/guides/chat

### Railway Docs:
- Deployment: https://docs.railway.app/deploy/deployments
- Environment Variables: https://docs.railway.app/develop/variables

---

## ✅ Checklist

### Before Deployment:
- [ ] OpenAI API key obtained
- [ ] Mattermost bot account created
- [ ] Bot access token copied
- [ ] Slash command created
- [ ] Command token copied
- [ ] Environment variables set
- [ ] Local testing successful

### After Deployment:
- [ ] Railway service running
- [ ] Health check passing
- [ ] Environment variables configured in Railway
- [ ] Slash command URL updated
- [ ] Bot added to test channel
- [ ] `/ai` command tested successfully

---

## 🎉 Success!

Once configured, you can:
- ✅ Ask AI questions in any Mattermost channel
- ✅ Get instant AI-powered responses
- ✅ Help team members with ERP questions
- ✅ Automate common support queries

**Example conversation:**
```
User: /ai How do I create a purchase order?

🤖 AI Assistant:
To create a purchase order in your ERP system:

1. Navigate to Procurement → Purchase Orders
2. Click "New Purchase Order"
3. Select vendor from dropdown
4. Add items with quantities
5. Set delivery date
6. Review and submit for approval

Need more specific help with your ERP? Just ask!
```

---

## 📞 Support

**Issues?**
- Check Railway logs: `railway logs`
- Test health: `/health` endpoint
- Verify tokens in Mattermost admin panel
- Review OpenAI usage dashboard

**Need help?**
- Mattermost docs: https://docs.mattermost.com
- OpenAI support: https://platform.openai.com/docs
- Railway support: https://railway.app/help

---

**Happy chatting with AI! 🤖✨**
