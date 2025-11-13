# 🔧 Spark AI Not Working - Fix Guide

**Date:** 12 November 2025  
**Issue:** Spark AI / BISMAN AI Assistant not working  
**Root Cause:** Ollama (local AI engine) is not installed  
**Status:** 🔧 FIXABLE

---

## 🐛 Problem Identified

**Spark AI** (your BISMAN AI Assistant) requires **Ollama** - a local AI engine that runs AI models on your computer without needing cloud APIs or API keys.

### Current Status:
❌ **Ollama is NOT installed**  
❌ **AI models are NOT available**  
❌ **Spark AI cannot function**

---

## ✅ Solution: Install Ollama

### Option 1: Quick Install (Recommended)

**On macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Or download from website:**
1. Go to: https://ollama.com/download
2. Download Ollama for macOS
3. Install the .dmg file
4. Launch Ollama

### Option 2: Manual Installation

1. **Download Ollama:**
   - Visit: https://ollama.com/download
   - Download for your OS (macOS, Linux, Windows)

2. **Install:**
   - macOS: Open the .dmg and drag to Applications
   - Linux: Run the install script
   - Windows: Run the installer

3. **Verify Installation:**
   ```bash
   ollama --version
   ```

---

## 🚀 Setup Steps

### Step 1: Install Ollama
```bash
# For macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Start Ollama Service
```bash
# Start Ollama in background
ollama serve &
```

Or simply launch the Ollama app from your Applications folder (macOS).

### Step 3: Download an AI Model

Choose ONE of these models (recommended: **mistral** for best balance):

```bash
# RECOMMENDED: Mistral (fast, good quality, 4GB)
ollama pull mistral

# OR: Llama 3 (more powerful, 4.7GB)
ollama pull llama3

# OR: Phi-3 (smaller, fastest, 2.3GB)
ollama pull phi3
```

### Step 4: Test AI Model
```bash
# Test the AI
ollama run mistral "Hello, introduce yourself in one sentence"
```

You should see a response like:
```
Hello! I'm Mistral, a conversational AI assistant here to help answer your questions.
```

### Step 5: Restart Your Backend
```bash
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend
npm start
```

### Step 6: Test Spark AI
1. Open your browser: `http://localhost:3000`
2. Click the chat bot icon (bottom-right, purple gradient)
3. Click "BISMAN AI Assistant"
4. Type a message: "Hello, who are you?"
5. You should get an AI response! 🎉

---

## 🧪 Verification Commands

### Check if Ollama is installed:
```bash
ollama --version
```

### Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

### List installed models:
```bash
ollama list
```

### Test a query:
```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "Say hello",
    "stream": false
  }'
```

### Check backend AI health:
```bash
curl http://localhost:4000/api/ai/health
```

---

## 📊 AI Model Comparison

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **Mistral** | 4GB | Fast | Good | ⭐ **Recommended** - General use |
| **Llama 3** | 4.7GB | Medium | Excellent | Complex queries, reasoning |
| **Phi-3** | 2.3GB | Very Fast | Good | Quick responses, low resources |
| **CodeLlama** | 7GB | Slower | Excellent | Code generation, tech queries |

**Recommendation:** Start with **Mistral** for best balance of speed and quality.

---

## 🔧 Troubleshooting

### Problem: "ollama: command not found"
**Solution:** Ollama is not installed. Follow Step 1 above.

### Problem: "Connection refused" or "fetch failed"
**Solution:** Ollama service is not running.
```bash
ollama serve &
```

### Problem: "model 'mistral' not found"
**Solution:** AI model not downloaded.
```bash
ollama pull mistral
```

### Problem: Backend shows "LangChain not installed"
**Solution:** Install LangChain dependencies.
```bash
cd my-backend
npm install @langchain/community @langchain/core
```

### Problem: Ollama running but backend can't connect
**Solution:** Check Ollama URL in backend.
```bash
# Check if Ollama is on correct port
curl http://localhost:11434/api/tags

# If backend uses different URL, set environment variable
export OLLAMA_BASE_URL=http://localhost:11434
```

---

## 🎯 What Spark AI Can Do

Once installed, Spark AI (BISMAN AI Assistant) can help you with:

### 📊 Business Insights
- "Show me sales trends for last month"
- "What's our inventory status?"
- "Analyze purchase order patterns"

### 📈 Reports & Analytics
- "Generate a summary report"
- "What are our top-selling products?"
- "Predict sales for next quarter"

### 💡 ERP Assistance
- "How do I create a purchase order?"
- "Explain the approval workflow"
- "What permissions do I need for inventory?"

### 🤖 General Help
- "Help me understand this data"
- "Summarize recent transactions"
- "What should I focus on today?"

---

## 📁 Related Files

### Backend AI Service:
- **Service:** `/my-backend/services/aiService.js`
- **Routes:** `/my-backend/routes/aiRoute.js`
- **Analytics:** `/my-backend/routes/aiAnalyticsRoute.js`

### Frontend AI Pages:
- **AI Assistant:** `/my-frontend/src/modules/common/pages/ai-assistant.tsx`
- **Chat Widget:** `/my-frontend/src/components/ERPChatWidget.tsx`
- **Chat Window:** `/my-frontend/src/components/chat/ChatWindow.tsx`

### Configuration:
- **Ollama URL:** `http://localhost:11434` (default)
- **Default Model:** `mistral`
- **API Endpoint:** `http://localhost:4000/api/ai/*`

---

## 🚀 Quick Setup Script

Save this as `setup-spark-ai.sh` and run it:

```bash
#!/bin/bash

echo "🚀 Setting up Spark AI..."

# Install Ollama
if ! command -v ollama &> /dev/null; then
    echo "📥 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Start Ollama
echo "▶️  Starting Ollama service..."
ollama serve > /dev/null 2>&1 &
sleep 3

# Pull Mistral model
echo "📦 Downloading Mistral AI model (this may take a few minutes)..."
ollama pull mistral

# Test
echo "🧪 Testing AI..."
ollama run mistral "Say hello in one word" --verbose=false

# Install LangChain (if needed)
echo "📦 Installing LangChain dependencies..."
cd my-backend
npm install @langchain/community @langchain/core

echo ""
echo "✅ Spark AI setup complete!"
echo ""
echo "🎉 Next steps:"
echo "   1. Start your backend: cd my-backend && npm start"
echo "   2. Start your frontend: cd my-frontend && npm run dev"
echo "   3. Open http://localhost:3000"
echo "   4. Click the chat bot icon and talk to BISMAN AI!"
```

---

## 📚 Additional Resources

### Ollama Documentation:
- **Website:** https://ollama.com
- **Models:** https://ollama.com/library
- **GitHub:** https://github.com/ollama/ollama

### Alternative: Use Cloud AI (if you don't want local AI)

If you prefer using cloud AI instead of Ollama:

1. **OpenAI (ChatGPT):**
   ```bash
   # Set environment variables
   export AI_PROVIDER=openai
   export OPENAI_API_KEY=your-key-here
   ```

2. **Google Gemini:**
   ```bash
   export AI_PROVIDER=gemini
   export GEMINI_API_KEY=your-key-here
   ```

But **Ollama is recommended** because it's:
- ✅ **Free** - No API costs
- ✅ **Private** - Data stays on your computer
- ✅ **Fast** - No network latency
- ✅ **Offline** - Works without internet

---

## ✅ Summary

**Current Issue:**
❌ Ollama not installed → Spark AI cannot function

**Fix Steps:**
1. ✅ Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
2. ✅ Start Ollama: `ollama serve &`
3. ✅ Download AI model: `ollama pull mistral`
4. ✅ Test: `ollama run mistral "hello"`
5. ✅ Restart backend: `cd my-backend && npm start`
6. ✅ Test Spark AI in your app

**Expected Result:**
🎉 Spark AI (BISMAN AI Assistant) will work and respond to your queries!

---

**Status:** 🔧 FIXABLE - Follow the steps above  
**Time to Fix:** ~10 minutes (including model download)  
**Difficulty:** 🟢 Easy

---

*💡 Tip: Once Ollama is installed and running, Spark AI will work automatically. The backend will detect it and enable all AI features!*
