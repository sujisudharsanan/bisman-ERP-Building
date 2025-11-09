# 🚀 Mattermost AI Setup - Complete Guide

## ✅ Installation Complete!

Your Mattermost AI connector is ready! Here's what to do next:

---

## 📋 Quick Setup (5 Steps)

### Step 1: Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in or create account
3. Click **"Create new secret key"**
4. Name it: `Mattermost AI`
5. **Copy the key** (starts with `sk-`)

### Step 2: Update `.env` File

Edit `mattermost-ai/.env`:

```env
# Replace with your actual OpenAI key
OPENAI_API_KEY=sk-your-actual-key-here

# Already configured (from your Mattermost token)
MATTERMOST_BOT_TOKEN=1y54w4qe4fg3djq186tixu34uc

# Will get this after creating slash command (Step 4)
MATTERMOST_COMMAND_TOKEN=your-command-token-here

# Your Mattermost URL (already set)
MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app
```

### Step 3: Create Bot Account in Mattermost

1. **Login to Mattermost** as admin: https://mattermost-production-84fd.up.railway.app
2. Click **☰ Main Menu** → **Integrations** → **Bot Accounts**
3. Click **"Add Bot Account"**
4. Fill in:
   ```
   Username: ai-assistant
   Display Name: AI Assistant
   Description: AI-powered ERP assistant
   Role: Member
   ```
5. Click **"Create Bot Account"**
6. **Copy the Access Token** 
7. Update `.env`: `MATTERMOST_BOT_TOKEN=<copied-token>`

### Step 4: Deploy to Railway

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"
railway up
```

**After deployment:**
1. Railway will give you a URL like: `https://mattermost-ai-production-xxxx.up.railway.app`
2. **Copy this URL** - you'll need it for the slash command

### Step 5: Create Slash Command in Mattermost

1. In Mattermost: **Main Menu → Integrations → Slash Commands**
2. Click **"Add Slash Command"**
3. Fill in:
   ```
   Title: AI Assistant
   Description: Ask questions to AI
   Command Trigger Word: ai
   Request URL: https://your-railway-url.up.railway.app/mattermost/command
   Request Method: POST
   Response Username: AI Assistant
   ```
4. Click **"Save"**
5. **Copy the Token** shown
6. Update Railway environment variable:
   ```bash
   railway variables set MATTERMOST_COMMAND_TOKEN=<copied-token>
   ```

---

## 🎯 Test It!

### 1. Add Bot to a Channel

1. Go to any Mattermost channel
2. Click channel name → **Add Members**
3. Search: `@ai-assistant`
4. Add the bot

### 2. Try the `/ai` Command

```
/ai What is ERP?
/ai How do I create a sales order?
/ai Explain inventory management
```

### Expected Response:

```
@yourusername asked:
> What is ERP?

🤖 AI Assistant:
ERP (Enterprise Resource Planning) is a type of software...
```

---

## 🌐 Deployment Options

### Option A: Railway (Recommended)

```bash
cd "/Users/abhi/Desktop/BISMAN EP/mattermost-ai"
railway up
```

Then configure environment variables in Railway dashboard:
- `OPENAI_API_KEY`
- `MATTERMOST_BOT_TOKEN`
- `MATTERMOST_COMMAND_TOKEN`
- `MATTERMOST_BASE_URL`

### Option B: Local Testing

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"
npm start
```

Use ngrok to expose local server:
```bash
ngrok http 3000
```

Use ngrok URL in Mattermost slash command.

---

## 📊 Environment Variables Reference

### Required:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys |
| `MATTERMOST_BOT_TOKEN` | Bot access token | Mattermost → Bot Accounts |
| `MATTERMOST_COMMAND_TOKEN` | Slash command token | Mattermost → Slash Commands |
| `MATTERMOST_BASE_URL` | Your Mattermost URL | Already set |

### Optional:

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_URL` | Local Ollama fallback | `http://localhost:11434` |
| `PORT` | Server port | `3000` |

---

## 🔧 Railway Configuration

### Set Environment Variables:

```bash
# Navigate to project
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"

# Set variables
railway variables set OPENAI_API_KEY=sk-your-key
railway variables set MATTERMOST_BOT_TOKEN=your-bot-token
railway variables set MATTERMOST_COMMAND_TOKEN=your-command-token
railway variables set MATTERMOST_BASE_URL=https://mattermost-production-84fd.up.railway.app
```

### Or use Railway Dashboard:

1. Open: https://railway.app
2. Select your project
3. Go to service → **Variables**
4. Add each variable

---

## 🎨 Customization

### Change AI Model:

Edit `server.js`:
```javascript
model: "gpt-4",  // More powerful
// or
model: "gpt-3.5-turbo",  // Cheaper
```

### Custom System Prompt:

```javascript
{
  role: "system",
  content: "You are an expert ERP consultant specializing in manufacturing and supply chain."
}
```

### Response Format:

```javascript
const formattedMessage = `✨ **AI Response:**\n${answer}`;
```

---

## 🐛 Troubleshooting

### Bot not responding:

**Check health:**
```bash
curl https://your-railway-app.up.railway.app/health
```

**Check Railway logs:**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/mattermost-ai"
railway logs --tail 100
```

**Verify bot in channel:**
- Make sure `@ai-assistant` is added to the channel

### "Unauthorized" error:

- Verify `MATTERMOST_COMMAND_TOKEN` matches the token from slash command
- Check token is set in Railway variables

### OpenAI errors:

**Check API key:**
- Verify key starts with `sk-`
- Check OpenAI dashboard for quota/billing

**Fallback to Ollama:**
- Install Ollama: `brew install ollama`
- Pull model: `ollama pull tinyllama`
- Run: `ollama serve`

### 502 Bad Gateway:

- Service might be starting up (wait 1-2 minutes)
- Check Railway deployment logs
- Verify all environment variables are set

---

## 📈 Monitoring

### Health Check:

```bash
curl https://your-app.up.railway.app/health
```

**Response:**
```json
{
  "ok": true,
  "service": "mattermost-ai",
  "config": {
    "openai": true,
    "mattermost_url": "https://...",
    "bot_token": true,
    "command_token": true
  }
}
```

### Check Logs:

**Railway:**
```bash
railway logs --tail 50
```

**Local:**
```bash
npm start
# Watch console output
```

### Test Command:

In Mattermost:
```
/ai hello
```

Should get AI response!

---

## 💰 Cost Estimation

### OpenAI Pricing (gpt-4o-mini):

- **Input:** $0.150 / 1M tokens
- **Output:** $0.600 / 1M tokens

### Typical Usage:

- Question: ~50 tokens
- Answer: ~200 tokens
- **Cost per query:** ~$0.00015

### Monthly Estimates:

| Queries/Month | Estimated Cost |
|---------------|----------------|
| 1,000 | $0.15 |
| 10,000 | $1.50 |
| 100,000 | $15.00 |

**Very affordable!** ✅

---

## ✅ Setup Checklist

### Before Deployment:
- [ ] OpenAI API key obtained
- [ ] `.env` file updated with API key
- [ ] Dependencies installed (`npm install`)
- [ ] Local test successful (`npm start`)

### Mattermost Configuration:
- [ ] Bot account created
- [ ] Bot access token copied
- [ ] Bot added to test channel

### Railway Deployment:
- [ ] Service deployed (`railway up`)
- [ ] Public URL obtained
- [ ] Environment variables set in Railway
- [ ] Slash command created
- [ ] Command token copied and set

### Testing:
- [ ] Health endpoint returns OK
- [ ] `/ai` command works in Mattermost
- [ ] Bot posts responses to channel
- [ ] AI responses are relevant

---

## 🎉 Success Criteria

When everything is working:

1. ✅ `/ai <question>` in any channel
2. ✅ Bot responds with "🤔 Thinking..."
3. ✅ AI response appears in channel
4. ✅ Formatted nicely with username
5. ✅ Relevant and helpful answers

**Example:**
```
You: /ai What is the difference between ERP and CRM?

@ai-assistant:
@yourusername asked:
> What is the difference between ERP and CRM?

🤖 AI Assistant:
ERP (Enterprise Resource Planning) manages internal business processes 
like finance, inventory, and manufacturing, while CRM (Customer Relationship 
Management) focuses on managing customer interactions, sales, and marketing.

Key differences:
• ERP: Internal operations
• CRM: Customer-facing activities
• Often integrated for complete business management

Both are essential for modern businesses!
```

---

## 📚 Additional Resources

### Documentation:
- **OpenAI API:** https://platform.openai.com/docs
- **Mattermost Integrations:** https://docs.mattermost.com/developer/integrations.html
- **Railway Deployment:** https://docs.railway.app

### Support:
- **OpenAI Support:** https://help.openai.com
- **Mattermost Community:** https://mattermost.com/community
- **Railway Discord:** https://discord.gg/railway

---

## 🚀 Next Steps

### Immediate:
1. Get OpenAI API key
2. Deploy to Railway
3. Create slash command
4. Test in Mattermost

### Future Enhancements:
- Add more commands (`/summary`, `/analyze`)
- Integrate with ERP database for context
- Add conversation memory
- Support image analysis
- Multi-language support

---

**Ready to go! Follow the 5 steps above and you'll have AI chat in Mattermost! 🎉**
