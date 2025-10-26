# 🚀 AI Module - Quick Start Guide

## ⚡ 5-Minute Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database running
- Terminal access

### Step 1: Install Ollama (2 minutes)

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version
```

### Step 2: Download AI Model (2 minutes)

```bash
# Download Mistral (recommended)
ollama pull mistral

# Start Ollama service (keep this terminal open)
ollama serve
```

### Step 3: Setup Backend (1 minute)

Open a new terminal:

```bash
cd my-backend

# Install dependencies
npm install langchain node-cron

# Run database migration
psql -h localhost -U your_user -d your_database -f migrations/ai-module-setup.sql

# Add to .env
echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
echo "OLLAMA_MODEL=mistral" >> .env
echo "AI_CRON_ENABLED=true" >> .env

# Start backend
npm run dev
```

### Step 4: Test It! (30 seconds)

```bash
# Test AI health
curl http://localhost:3000/api/ai/health

# Should return: {"success": true, "status": "healthy"}
```

### Step 5: Use the UI

1. Start your frontend: `cd my-frontend && npm run dev`
2. Open browser: http://localhost:3000
3. Navigate to **AI Assistant** (or `/ai-assistant`)
4. Start chatting! 🎉

---

## 🎯 Quick Test Commands

### Test AI Query
```bash
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "What is ERP?"}'
```

### Generate Analytics Report
```bash
curl http://localhost:3000/api/ai/analytics/generate-report \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Conversation History
```bash
curl http://localhost:3000/api/ai/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📦 What Was Installed

### Backend Files
- `services/aiService.js` - AI integration
- `services/aiAnalyticsEngine.js` - Analytics
- `routes/aiRoute.js` - API endpoints
- `routes/aiAnalyticsRoute.js` - Analytics endpoints
- `cron/aiAnalyticsJob.js` - Automated reports
- `migrations/ai-module-setup.sql` - Database schema

### Frontend Files
- `src/modules/common/pages/ai-assistant.tsx` - Chat UI

### Database Tables
- `ai_conversations` - Chat history
- `ai_reports` - Generated reports
- `ai_settings` - Configuration
- `ai_analytics_cache` - Performance cache

---

## ⚙️ Environment Variables

Add these to `my-backend/.env`:

```env
# Required
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Optional (with defaults)
AI_CRON_ENABLED=true
AI_DAILY_REPORT_TIME=0 20 * * *
AI_CACHE_CLEANUP_TIME=0 2 * * *
AI_DATA_RETENTION_DAYS=90
```

---

## 🎨 Customization

### Change AI Model

```bash
# Download different model
ollama pull llama3

# Update .env
OLLAMA_MODEL=llama3

# Restart backend
npm run dev
```

### Disable Auto Reports (Development)

```env
AI_CRON_ENABLED=false
```

### Adjust Report Schedule

```env
# Daily reports at 6 PM
AI_DAILY_REPORT_TIME=0 18 * * *
```

---

## 🐛 Troubleshooting

### "Cannot connect to Ollama"
```bash
# Start Ollama
ollama serve
```

### "Model not found"
```bash
# Pull model
ollama pull mistral

# Verify
ollama list
```

### "Database error"
```bash
# Re-run migration
psql -h localhost -U user -d db -f migrations/ai-module-setup.sql
```

### Frontend shows "Offline"
```bash
# Check all services
ps aux | grep ollama  # Should be running
curl http://localhost:11434/api/tags  # Should return models
curl http://localhost:3000/api/ai/health  # Should return healthy
```

---

## 📱 Using the UI

### Chat Tab
1. Type your question in the input box
2. Press Enter or click Send
3. AI responds in real-time
4. Conversation saved automatically

**Quick Prompts:**
- "What were our sales yesterday?"
- "Show me inventory status"
- "Predict sales for next week"
- "Which items need reordering?"

### Reports Tab
1. Click "Generate New Report"
2. Wait ~10-30 seconds
3. View generated insights
4. Reports saved automatically

### Analytics Tab
Coming soon - interactive charts and dashboards

---

## 📊 Features

✅ Natural language queries  
✅ Automated daily reports (8 PM)  
✅ Sales predictions  
✅ Inventory insights  
✅ Multi-tenant support  
✅ Role-based access  
✅ Conversation history  
✅ Fully offline  
✅ 100% free  
✅ Private & secure  

---

## 🚀 Deployment

### Production Checklist

1. **Install Ollama on server**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull mistral
   ```

2. **Auto-start Ollama**
   ```bash
   # Create systemd service (Linux)
   sudo systemctl enable ollama
   sudo systemctl start ollama
   ```

3. **Deploy backend with AI enabled**
   - Ensure env vars set
   - Run database migration
   - Start backend service

4. **Verify deployment**
   ```bash
   curl https://your-domain.com/api/ai/health
   ```

---

## 🎉 Success!

Your AI assistant is ready when:

✅ Health check returns `"healthy"`  
✅ UI shows green "Online" status  
✅ You can send and receive messages  
✅ Reports generate successfully  

---

## 📖 Full Documentation

See `AI_MODULE_COMPLETE_GUIDE.md` for:
- Detailed API documentation
- Advanced configuration
- Performance optimization
- Security best practices
- Troubleshooting guide

---

## 🆘 Need Help?

1. Check logs: `tail -f my-backend/backend.log`
2. Test health: `curl http://localhost:3000/api/ai/health`
3. Verify Ollama: `ollama list`
4. Check database: `psql -d db -c "\dt ai_*"`

---

**Happy AI-powered ERP management! 🎊**
