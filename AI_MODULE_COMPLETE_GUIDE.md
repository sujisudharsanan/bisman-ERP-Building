# 🤖 AI Assistant Module - Complete Implementation Guide

## 📋 Overview

Your ERP system now includes a **fully local, offline AI Assistant and Analytics Engine** powered by Ollama. This module provides:

- ✅ Natural language queries about ERP data
- ✅ Automated daily/weekly analytics reports
- ✅ Sales predictions and trend analysis
- ✅ Inventory insights and recommendations
- ✅ Multi-tenant support with role-based access
- ✅ 100% free, offline, and private
- ✅ Ready for deployment

---

## 🏗️ Architecture

### Backend Structure
```
my-backend/
├── services/
│   ├── aiService.js              # Core AI integration (Ollama)
│   └── aiAnalyticsEngine.js      # Analytics & reporting logic
├── routes/
│   ├── aiRoute.js                # AI query endpoints
│   └── aiAnalyticsRoute.js       # Analytics endpoints
├── cron/
│   └── aiAnalyticsJob.js         # Automated report generation
├── migrations/
│   └── ai-module-setup.sql       # Database schema
└── reports/ai/                   # Generated reports storage
```

### Frontend Structure
```
my-frontend/
└── src/modules/common/pages/
    └── ai-assistant.tsx          # AI chat interface
```

### Database Tables
- `ai_conversations` - Chat history
- `ai_reports` - Generated analytics reports
- `ai_settings` - Configuration per tenant/user
- `ai_analytics_cache` - Performance optimization

---

## 🚀 Installation & Setup

### Step 1: Install Ollama (Local AI Runtime)

**On macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**On Windows:**
Download from: https://ollama.com/download

**Verify installation:**
```bash
ollama --version
```

### Step 2: Download AI Model

```bash
# Recommended: Mistral (7B parameters, fast, accurate)
ollama pull mistral

# Alternative: Llama 3 (8B parameters, more capable)
ollama pull llama3

# Lightweight option: Phi-3 (3.8B parameters, very fast)
ollama pull phi3
```

**Start Ollama service:**
```bash
ollama serve
```

> 💡 **Tip:** Add Ollama to startup:
> - macOS: `brew services start ollama`
> - Linux: Create systemd service
> - Windows: Add to startup programs

### Step 3: Install Node.js Dependencies

```bash
cd my-backend
npm install langchain node-cron
```

### Step 4: Run Database Migration

```bash
psql -h your-host -U your-user -d your-database -f migrations/ai-module-setup.sql
```

Or using your migration tool:
```bash
npm run prisma:migrate
```

### Step 5: Configure Environment Variables

Add to `my-backend/.env`:
```env
# AI Module Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
AI_CRON_ENABLED=true
AI_DAILY_REPORT_TIME=0 20 * * *
AI_CACHE_CLEANUP_TIME=0 2 * * *
AI_DATA_RETENTION_DAYS=90
```

### Step 6: Start Your ERP

```bash
# Backend
cd my-backend
npm run dev

# Frontend (separate terminal)
cd my-frontend
npm run dev
```

---

## 🧪 Testing

### Test AI Service Health

```bash
curl http://localhost:3000/api/ai/health
```

**Expected response:**
```json
{
  "success": true,
  "status": "healthy",
  "model": "mistral",
  "baseUrl": "http://localhost:11434",
  "responsive": true,
  "message": "AI service is operational"
}
```

### Test AI Query

```bash
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "prompt": "Explain how petrol pump management works"
  }'
```

### Test Analytics Report Generation

```bash
curl http://localhost:3000/api/ai/analytics/generate-report \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 API Endpoints

### AI Query Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/ai/health` | GET | Check AI service status | ❌ |
| `/api/ai/query` | POST | Ask AI a question | ✅ |
| `/api/ai/query-data` | POST | Natural language SQL query | ✅ |
| `/api/ai/summarize` | POST | Summarize text | ✅ |
| `/api/ai/conversations` | GET | Get conversation history | ✅ |
| `/api/ai/conversations/:id` | DELETE | Delete conversation | ✅ |

### Analytics Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/ai/analytics/generate-report` | GET | Generate new report | ✅ |
| `/api/ai/analytics/sales-insights` | GET | Sales analytics | ✅ |
| `/api/ai/analytics/inventory-insights` | GET | Inventory analytics | ✅ |
| `/api/ai/analytics/predict-sales` | GET | Predict future sales | ✅ |
| `/api/ai/analytics/reports` | GET | Get recent reports | ✅ |
| `/api/ai/analytics/reports/:id` | GET | Get specific report | ✅ |
| `/api/ai/analytics/reports/:id` | DELETE | Delete report | ✅ (Enterprise Admin) |
| `/api/ai/analytics/custom` | POST | Custom analytics | ✅ |

---

## 🔐 Security & Permissions

### Role-Based Access

- **Enterprise Admin:** Full access to all AI features, all tenants
- **Super Admin:** Access to AI for their tenant only
- **Hub Incharge:** Access to AI for their hub data
- **Staff:** Basic AI queries only (no analytics)

### Data Isolation

- All queries automatically filtered by `tenant_id`
- Enterprise admins can access cross-tenant insights
- Conversations saved with user and tenant context

---

## ⏰ Automated Reports

### Daily Reports (8 PM)

Automatically generates:
- Sales summary (last 7 days)
- Inventory status
- Low stock alerts
- Revenue trends
- Predictions for next 7 days

### Weekly Reports (Sunday 7 PM)

Comprehensive weekly summary with:
- Week-over-week comparisons
- Top performing products
- Revenue analysis
- Strategic recommendations

### Cleanup Tasks (2 AM Daily)

- Remove expired cache entries
- Delete old conversations (90+ days)
- Archive old report files

---

## 📁 File Storage

### Reports Location

```
my-backend/reports/ai/
├── erp_ai_insight_2025-10-26_tenant_1.json
├── erp_ai_insight_2025-10-26_tenant_2.json
└── erp_ai_insight_2025-10-26_enterprise.json
```

### Database Storage

- Conversations: `ai_conversations` table
- Reports: `ai_reports` table (JSONB for full data)
- Settings: `ai_settings` table

---

## 🎨 Frontend Usage

### Navigate to AI Assistant

1. Log in to your ERP
2. Go to `/ai-assistant` or find "AI Assistant" in the sidebar
3. Start chatting with the AI

### Features Available

**Chat Tab:**
- Real-time AI responses
- Conversation history
- Quick prompt suggestions
- Clear conversation option

**Reports Tab:**
- View all generated reports
- Generate new reports on-demand
- Download report data

**Analytics Tab:**
- Coming soon: Interactive charts and dashboards

---

## 🔧 Configuration Options

### Change AI Model

Edit `my-backend/.env`:
```env
OLLAMA_MODEL=llama3
```

Restart backend:
```bash
npm run dev
```

### Adjust Report Schedule

Edit `my-backend/.env`:
```env
# Daily reports at 6 PM instead of 8 PM
AI_DAILY_REPORT_TIME=0 18 * * *

# Weekly reports on Friday at 5 PM
AI_WEEKLY_REPORT_TIME=0 17 * * 5
```

### Change Data Retention

```env
# Keep conversations for 60 days instead of 90
AI_DATA_RETENTION_DAYS=60
```

### Disable Cron Jobs (Development)

```env
AI_CRON_ENABLED=false
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Ollama"

**Solution:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

### Issue: "Model not found"

**Solution:**
```bash
# Pull the model
ollama pull mistral

# Verify it's installed
ollama list
```

### Issue: "Slow AI responses"

**Solutions:**
- Use a smaller model: `ollama pull phi3`
- Increase system RAM allocation
- Close other heavy applications
- Consider GPU acceleration (if available)

### Issue: "Database migration failed"

**Solution:**
```bash
# Check database connection
psql -h localhost -U your_user -d your_db

# Run migration manually
psql -h localhost -U your_user -d your_db -f migrations/ai-module-setup.sql
```

### Issue: "Frontend shows 'AI offline'"

**Checklist:**
1. ✅ Ollama running: `ollama serve`
2. ✅ Model downloaded: `ollama list`
3. ✅ Backend started: `npm run dev`
4. ✅ Health endpoint works: `curl http://localhost:3000/api/ai/health`

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Ollama installed on server
- [ ] AI model downloaded (mistral/llama3)
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Dependencies installed: `npm install`
- [ ] Backend tested locally
- [ ] Frontend tested locally

### During Deployment

- [ ] Start Ollama service: `ollama serve`
- [ ] Set Ollama to auto-start on boot
- [ ] Deploy backend with AI routes enabled
- [ ] Deploy frontend with AI assistant page
- [ ] Run database migrations
- [ ] Verify `/api/ai/health` endpoint responds

### Post-Deployment

- [ ] Test AI queries from production UI
- [ ] Verify cron jobs are running
- [ ] Check first automated report generation
- [ ] Test different user roles and permissions
- [ ] Monitor system resources (RAM/CPU)
- [ ] Set up log monitoring for AI errors

---

## 📈 Performance Optimization

### Caching

The system includes automatic caching:
- Frequent queries cached for 1 hour
- Analytics results cached per tenant
- Auto-cleanup of expired cache

### Resource Usage

**Typical requirements:**
- RAM: 4-8 GB for Mistral, 8-16 GB for Llama3
- CPU: 4+ cores recommended
- Disk: 5-10 GB for models
- Network: Not required (fully offline)

### Scaling Tips

1. **For large deployments:**
   - Use dedicated AI server
   - Run Ollama on separate machine
   - Configure `OLLAMA_BASE_URL` to remote server

2. **For multiple tenants:**
   - Enable aggressive caching
   - Schedule reports at different times
   - Use smaller model (phi3) for routine queries

---

## 🔄 Upgrading Models

### Switch to a better model:

```bash
# Download new model
ollama pull llama3

# Update config
echo "OLLAMA_MODEL=llama3" >> .env

# Restart backend
npm run dev
```

### Use multiple models:

```javascript
// In aiService.js, add model selection
function getOllamaClient(options = {}) {
  const model = options.model || process.env.OLLAMA_MODEL || 'mistral';
  return new Ollama({ model, baseUrl: OLLAMA_BASE_URL });
}
```

---

## 🆘 Support & Documentation

### Built-in Help

- Visit `/ai-assistant` in your ERP
- Use quick prompts to get started
- Check `/api/ai/health` for status

### Logs Location

```bash
# Backend logs
tail -f my-backend/backend.log

# AI-specific logs
grep "\[aiService\]" my-backend/backend.log
grep "\[aiAnalytics\]" my-backend/backend.log
```

### External Resources

- Ollama Documentation: https://ollama.com/docs
- LangChain.js: https://js.langchain.com/
- Model comparisons: https://ollama.com/library

---

## ✅ Verification Steps

Run these commands to verify everything works:

```bash
# 1. Check Ollama
ollama list
ollama run mistral "Say hello"

# 2. Check backend dependencies
cd my-backend
npm list langchain node-cron

# 3. Check database tables
psql -d your_db -c "\dt ai_*"

# 4. Check backend routes
curl http://localhost:3000/api/ai/health

# 5. Check file structure
ls -la my-backend/services/ai*.js
ls -la my-backend/routes/ai*.js
ls -la my-backend/cron/ai*.js
ls -la my-backend/migrations/ai*.sql
ls -la my-frontend/src/modules/common/pages/ai-assistant.tsx

# 6. Test authentication
curl -X POST http://localhost:3000/api/ai/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt":"Test"}' | jq
```

---

## 🎉 Success Indicators

Your AI module is working correctly if:

✅ `/api/ai/health` returns `"status": "healthy"`  
✅ Chat UI shows green "Online" status  
✅ You can send messages and get responses  
✅ Reports tab shows generated reports  
✅ Daily reports appear in `reports/ai/` folder  
✅ Conversations saved in `ai_conversations` table  

---

## 📞 Next Steps

1. **Test the AI assistant** - Ask questions about your data
2. **Review generated reports** - Check insights accuracy
3. **Customize prompts** - Tailor AI responses to your business
4. **Monitor performance** - Watch resource usage
5. **Train your team** - Show them how to use AI features
6. **Expand capabilities** - Add voice input, OCR, etc.

---

## 🔮 Future Enhancements

### Planned Features

- [ ] Voice input (Whisper.cpp integration)
- [ ] Document OCR (Tesseract.js)
- [ ] Semantic search (Chroma embeddings)
- [ ] Interactive charts in Analytics tab
- [ ] Custom report templates
- [ ] Email report delivery
- [ ] Slack/Teams notifications
- [ ] Multi-language support

### Optional Paid Upgrades

If you later want cloud AI capabilities:
- Switch to OpenAI API (just change aiService.js)
- Use Anthropic Claude for better analysis
- Enable GPT-4 for complex queries

The modular design makes this easy without changing frontend!

---

**🎊 Congratulations! Your ERP now has a fully functional local AI assistant!**

For questions or issues, check the logs or refer to this guide.
