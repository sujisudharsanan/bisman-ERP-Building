#!/bin/bash

###############################################################################
# AI Module Installation Script for BISMAN ERP
# This script automates the setup of the local AI assistant module
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then 
        log_warning "Please do not run this script as root"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_step "Step 1: Checking Prerequisites"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        log_success "Node.js installed: $NODE_VERSION"
    else
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        log_success "npm installed: $NPM_VERSION"
    else
        log_error "npm is not installed."
        exit 1
    fi
    
    # Check psql
    if command -v psql &> /dev/null; then
        log_success "PostgreSQL client installed"
    else
        log_warning "psql not found. You'll need to run database migration manually."
    fi
    
    # Check if in correct directory
    if [ ! -d "my-backend" ]; then
        log_error "Please run this script from the ERP root directory"
        exit 1
    fi
}

# Install Ollama
install_ollama() {
    log_step "Step 2: Installing Ollama (Local AI Runtime)"
    
    if command -v ollama &> /dev/null; then
        log_success "Ollama is already installed"
        ollama --version
    else
        log_info "Installing Ollama..."
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            curl -fsSL https://ollama.com/install.sh | sh
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl -fsSL https://ollama.com/install.sh | sh
        else
            log_warning "Automatic Ollama installation not supported on this OS"
            log_info "Please install Ollama manually from: https://ollama.com/download"
            exit 1
        fi
        
        log_success "Ollama installed successfully"
    fi
}

# Download AI model
download_model() {
    log_step "Step 3: Downloading AI Model"
    
    log_info "Checking if Mistral model is available..."
    
    if ollama list | grep -q "mistral"; then
        log_success "Mistral model already downloaded"
    else
        log_info "Downloading Mistral model (this may take a few minutes)..."
        ollama pull mistral
        log_success "Mistral model downloaded"
    fi
    
    log_info "Available models:"
    ollama list
}

# Start Ollama service
start_ollama() {
    log_step "Step 4: Starting Ollama Service"
    
    # Check if Ollama is already running
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        log_success "Ollama service is already running"
    else
        log_info "Starting Ollama service..."
        
        # Start in background
        nohup ollama serve > /dev/null 2>&1 &
        
        # Wait for service to start
        sleep 3
        
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            log_success "Ollama service started successfully"
        else
            log_warning "Ollama service may not have started correctly"
            log_info "Try running: ollama serve"
        fi
    fi
}

# Install backend dependencies
install_dependencies() {
    log_step "Step 5: Installing Backend Dependencies"
    
    cd my-backend
    
    log_info "Installing langchain and node-cron..."
    npm install langchain@^0.3.0 node-cron@^3.0.3 --save
    
    log_success "Dependencies installed"
    cd ..
}

# Setup environment variables
setup_env() {
    log_step "Step 6: Configuring Environment Variables"
    
    ENV_FILE="my-backend/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found at $ENV_FILE"
        exit 1
    fi
    
    # Check if AI config already exists
    if grep -q "OLLAMA_BASE_URL" "$ENV_FILE"; then
        log_warning "AI configuration already exists in .env"
        read -p "Overwrite? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping environment setup"
            return
        fi
    fi
    
    log_info "Adding AI configuration to .env..."
    
    cat >> "$ENV_FILE" << 'EOF'

# ============================================
# AI Module Configuration
# ============================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
AI_CRON_ENABLED=true
AI_DAILY_REPORT_TIME=0 20 * * *
AI_CACHE_CLEANUP_TIME=0 2 * * *
AI_DATA_RETENTION_DAYS=90
EOF
    
    log_success "Environment variables configured"
}

# Run database migration
run_migration() {
    log_step "Step 7: Running Database Migration"
    
    if [ ! -f "my-backend/migrations/ai-module-setup.sql" ]; then
        log_error "Migration file not found"
        exit 1
    fi
    
    log_info "Database migration file ready at: my-backend/migrations/ai-module-setup.sql"
    log_warning "You need to run the migration manually using your database tool"
    
    echo ""
    log_info "Run this command:"
    echo -e "${GREEN}psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE -f my-backend/migrations/ai-module-setup.sql${NC}"
    echo ""
    
    read -p "Have you run the migration? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_success "Database migration confirmed"
    else
        log_warning "Please run the migration before using AI features"
    fi
}

# Test installation
test_installation() {
    log_step "Step 8: Testing Installation"
    
    log_info "Testing Ollama service..."
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        log_success "Ollama service is responding"
    else
        log_error "Ollama service is not responding"
        log_info "Try running: ollama serve"
    fi
    
    log_info "Testing AI model..."
    if ollama list | grep -q "mistral"; then
        log_success "Mistral model is available"
    else
        log_warning "Mistral model may not be properly installed"
    fi
    
    log_info "Checking file structure..."
    files=(
        "my-backend/services/aiService.js"
        "my-backend/services/aiAnalyticsEngine.js"
        "my-backend/routes/aiRoute.js"
        "my-backend/routes/aiAnalyticsRoute.js"
        "my-backend/cron/aiAnalyticsJob.js"
        "my-backend/migrations/ai-module-setup.sql"
        "my-frontend/src/modules/common/pages/ai-assistant.tsx"
    )
    
    all_exist=true
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
            all_exist=false
        fi
    done
    
    if [ "$all_exist" = true ]; then
        log_success "All AI module files are in place"
    else
        log_error "Some files are missing"
    fi
}

# Print next steps
print_next_steps() {
    log_step "🎉 Installation Complete!"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  AI Module Setup Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}📋 Next Steps:${NC}\n"
    
    echo "1. Ensure Ollama is running:"
    echo -e "   ${GREEN}ollama serve${NC}\n"
    
    echo "2. Start your backend:"
    echo -e "   ${GREEN}cd my-backend && npm run dev${NC}\n"
    
    echo "3. Start your frontend:"
    echo -e "   ${GREEN}cd my-frontend && npm run dev${NC}\n"
    
    echo "4. Test the AI health endpoint:"
    echo -e "   ${GREEN}curl http://localhost:3000/api/ai/health${NC}\n"
    
    echo "5. Open your browser and navigate to:"
    echo -e "   ${GREEN}http://localhost:3000/ai-assistant${NC}\n"
    
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "   - Quick Start: AI_MODULE_QUICK_START.md"
    echo "   - Complete Guide: AI_MODULE_COMPLETE_GUIDE.md"
    echo ""
    
    echo -e "${BLUE}🔧 Configuration:${NC}"
    echo "   Edit my-backend/.env to customize AI settings"
    echo ""
    
    echo -e "${GREEN}✨ Your ERP now has AI superpowers! ✨${NC}\n"
}

# Main installation flow
main() {
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     BISMAN ERP - AI Module Installation Script           ║
║     Fully Local • Offline • Free • Private                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"
    
    check_root
    check_prerequisites
    install_ollama
    download_model
    start_ollama
    install_dependencies
    setup_env
    run_migration
    test_installation
    print_next_steps
}

# Run main function
main "$@"
