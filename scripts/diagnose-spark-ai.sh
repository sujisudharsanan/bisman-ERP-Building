#!/bin/bash

# Spark AI Diagnostic and Fix Script
# This script checks if Ollama is running and helps fix AI issues

echo "🔍 Diagnosing Spark AI Issues..."
echo "================================"
echo ""

# Check if Ollama is installed
echo "1️⃣ Checking if Ollama is installed..."
if command -v ollama &> /dev/null; then
    echo "   ✅ Ollama is installed"
    OLLAMA_VERSION=$(ollama --version 2>&1 | head -1)
    echo "   📦 Version: $OLLAMA_VERSION"
else
    echo "   ❌ Ollama is NOT installed"
    echo ""
    echo "📥 To install Ollama:"
    echo "   curl -fsSL https://ollama.com/install.sh | sh"
    echo ""
    exit 1
fi

echo ""

# Check if Ollama service is running
echo "2️⃣ Checking if Ollama service is running..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✅ Ollama service is running on port 11434"
else
    echo "   ❌ Ollama service is NOT running"
    echo ""
    echo "🚀 To start Ollama service:"
    echo "   ollama serve"
    echo ""
    echo "Or run in background:"
    echo "   nohup ollama serve > /dev/null 2>&1 &"
    echo ""
    exit 1
fi

echo ""

# Check available models
echo "3️⃣ Checking available AI models..."
MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys, json; data = json.load(sys.stdin); print('\n'.join([m['name'] for m in data.get('models', [])]))" 2>/dev/null)

if [ -z "$MODELS" ]; then
    echo "   ❌ No models installed"
    echo ""
    echo "📦 To install AI models:"
    echo "   ollama pull mistral        # Fast, good for general tasks (4GB)"
    echo "   ollama pull llama3         # More powerful (4.7GB)"
    echo "   ollama pull phi3           # Smaller, faster (2.3GB)"
    echo ""
    exit 1
else
    echo "   ✅ Found models:"
    echo "$MODELS" | while read model; do
        echo "      • $model"
    done
fi

echo ""

# Test AI query
echo "4️⃣ Testing AI query..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d '{
        "model": "mistral",
        "prompt": "Say hello in one word",
        "stream": false
    }' 2>&1)

if echo "$TEST_RESPONSE" | grep -q "response"; then
    echo "   ✅ AI query successful"
    RESPONSE=$(echo "$TEST_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('response', ''))" 2>/dev/null)
    echo "   🤖 AI Response: $RESPONSE"
else
    echo "   ❌ AI query failed"
    echo "   Error: $TEST_RESPONSE"
    exit 1
fi

echo ""

# Check backend AI routes
echo "5️⃣ Checking if backend is running..."
if curl -s http://localhost:4000/api/ai/health > /dev/null 2>&1; then
    echo "   ✅ Backend AI routes accessible"
    HEALTH=$(curl -s http://localhost:4000/api/ai/health)
    echo "   📊 Health: $HEALTH"
else
    echo "   ⚠️  Backend may not be running or AI routes not registered"
    echo ""
    echo "🔧 To start backend:"
    echo "   cd my-backend && npm start"
    echo ""
fi

echo ""

# Check if LangChain is installed
echo "6️⃣ Checking LangChain dependencies..."
cd "$(dirname "$0")/my-backend"
if grep -q "@langchain/community" package.json 2>/dev/null; then
    echo "   ✅ LangChain is in package.json"
    
    if [ -d "node_modules/@langchain" ]; then
        echo "   ✅ LangChain is installed"
    else
        echo "   ⚠️  LangChain not installed in node_modules"
        echo ""
        echo "📦 To install:"
        echo "   cd my-backend && npm install"
        echo ""
    fi
else
    echo "   ❌ LangChain not in dependencies"
    echo ""
    echo "📦 To install LangChain:"
    echo "   cd my-backend"
    echo "   npm install @langchain/community @langchain/core"
    echo ""
fi

echo ""
echo "================================"
echo "✅ Spark AI Diagnostic Complete!"
echo ""
echo "📝 Summary:"
echo "   • Ollama: $(command -v ollama &> /dev/null && echo '✅ Installed' || echo '❌ Not installed')"
echo "   • Service: $(curl -s http://localhost:11434/api/tags > /dev/null 2>&1 && echo '✅ Running' || echo '❌ Not running')"
echo "   • Models: $([ -n "$MODELS" ] && echo "✅ $(echo "$MODELS" | wc -l | tr -d ' ') installed" || echo '❌ None')"
echo "   • Backend: $(curl -s http://localhost:4000/api/ai/health > /dev/null 2>&1 && echo '✅ Running' || echo '⚠️  Check status')"
echo ""

# Provide next steps
if ! command -v ollama &> /dev/null; then
    echo "🔧 Next Steps:"
    echo "   1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh"
elif ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "🔧 Next Steps:"
    echo "   1. Start Ollama: ollama serve &"
elif [ -z "$MODELS" ]; then
    echo "🔧 Next Steps:"
    echo "   1. Install a model: ollama pull mistral"
else
    echo "🎉 Everything looks good! Spark AI should be working."
    echo ""
    echo "🧪 Test it:"
    echo "   1. Go to: http://localhost:3000/common/ai-assistant"
    echo "   2. Or click the chat bot icon and talk to BISMAN AI"
fi

echo ""
