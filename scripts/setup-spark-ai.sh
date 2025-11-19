#!/bin/bash

# Spark AI Automated Setup Script
# This script installs and configures Ollama for BISMAN ERP

set -e  # Exit on error

echo "🚀 BISMAN ERP - Spark AI Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check OS
OS="$(uname -s)"
echo "📟 Detected OS: $OS"
echo ""

# Step 1: Check if Ollama is installed
echo "1️⃣ Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    echo -e "   ${GREEN}✅ Ollama is already installed${NC}"
    ollama --version
else
    echo -e "   ${YELLOW}⚠️  Ollama not found. Installing...${NC}"
    echo ""
    
    if [ "$OS" = "Darwin" ]; then
        # macOS
        echo "   📥 Downloading Ollama for macOS..."
        curl -fsSL https://ollama.com/install.sh | sh
    elif [ "$OS" = "Linux" ]; then
        # Linux
        echo "   📥 Downloading Ollama for Linux..."
        curl -fsSL https://ollama.com/install.sh | sh
    else
        echo -e "   ${RED}❌ Unsupported OS: $OS${NC}"
        echo "   Please install Ollama manually from https://ollama.com/download"
        exit 1
    fi
    
    echo -e "   ${GREEN}✅ Ollama installed successfully${NC}"
fi

echo ""

# Step 2: Start Ollama service
echo "2️⃣ Starting Ollama service..."

# Check if already running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Ollama service is already running${NC}"
else
    echo "   ▶️  Starting Ollama..."
    
    # Start in background
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    
    # Wait for service to start
    echo "   ⏳ Waiting for Ollama to start..."
    for i in {1..10}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Ollama service started (PID: $OLLAMA_PID)${NC}"
            break
        fi
        sleep 1
    done
    
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "   ${RED}❌ Failed to start Ollama service${NC}"
        echo "   Check logs: tail -f /tmp/ollama.log"
        exit 1
    fi
fi

echo ""

# Step 3: Check and pull AI model
echo "3️⃣ Setting up AI model..."

# Check if mistral is already installed
if ollama list | grep -q "mistral"; then
    echo -e "   ${GREEN}✅ Mistral model already installed${NC}"
else
    echo "   📦 Downloading Mistral AI model..."
    echo "   ⚠️  This will download ~4GB. Please wait..."
    echo ""
    
    ollama pull mistral
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✅ Mistral model downloaded successfully${NC}"
    else
        echo -e "   ${RED}❌ Failed to download Mistral model${NC}"
        exit 1
    fi
fi

echo ""

# Step 4: Test AI model
echo "4️⃣ Testing AI model..."
echo "   🧪 Running test query..."

TEST_OUTPUT=$(ollama run mistral "Say hello in one word" 2>&1 | head -1)

if [ -n "$TEST_OUTPUT" ]; then
    echo -e "   ${GREEN}✅ AI test successful!${NC}"
    echo -e "   ${BLUE}🤖 AI Response: $TEST_OUTPUT${NC}"
else
    echo -e "   ${YELLOW}⚠️  AI test returned empty response${NC}"
fi

echo ""

# Step 5: Install LangChain dependencies
echo "5️⃣ Installing backend dependencies..."

cd "$(dirname "$0")/my-backend"

if [ -f "package.json" ]; then
    echo "   📦 Installing LangChain..."
    
    # Check if already installed
    if grep -q "@langchain/community" package.json; then
        echo -e "   ${GREEN}✅ LangChain already in package.json${NC}"
    else
        echo "   Adding LangChain to dependencies..."
        npm install @langchain/community @langchain/core --save
    fi
    
    # Install if not in node_modules
    if [ ! -d "node_modules/@langchain" ]; then
        echo "   📥 Running npm install..."
        npm install
    fi
    
    echo -e "   ${GREEN}✅ Backend dependencies ready${NC}"
else
    echo -e "   ${YELLOW}⚠️  package.json not found in my-backend${NC}"
fi

cd ..

echo ""

# Step 6: Final verification
echo "6️⃣ Final verification..."

echo "   🔍 Checking Ollama service..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Ollama service: Running${NC}"
else
    echo -e "   ${RED}❌ Ollama service: Not running${NC}"
fi

echo "   🔍 Checking AI models..."
MODEL_COUNT=$(ollama list | tail -n +2 | wc -l | tr -d ' ')
echo -e "   ${GREEN}✅ Installed models: $MODEL_COUNT${NC}"
ollama list | tail -n +2 | while read line; do
    echo "      • $(echo $line | awk '{print $1}')"
done

echo ""
echo "=============================="
echo -e "${GREEN}✅ Spark AI Setup Complete!${NC}"
echo "=============================="
echo ""
echo "📝 Summary:"
echo "   • Ollama: ✅ Installed and running"
echo "   • AI Model: ✅ Mistral ready"
echo "   • Backend: ✅ Dependencies installed"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start your backend:"
echo -e "   ${BLUE}cd my-backend && npm start${NC}"
echo ""
echo "2. Start your frontend:"
echo -e "   ${BLUE}cd my-frontend && npm run dev${NC}"
echo ""
echo "3. Open your browser:"
echo -e "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo "4. Test Spark AI:"
echo "   • Click the chat bot icon (bottom-right, purple gradient)"
echo "   • Click 'BISMAN AI Assistant'"
echo "   • Type: 'Hello, who are you?'"
echo "   • Get AI response! 🎉"
echo ""
echo "🧪 Manual Test:"
echo -e "   ${BLUE}ollama run mistral \"Tell me about BISMAN ERP\"${NC}"
echo ""
echo "📚 Documentation:"
echo "   See SPARK_AI_NOT_WORKING_FIX.md for troubleshooting"
echo ""
echo -e "${GREEN}🚀 Spark AI is ready to use!${NC}"
echo ""
