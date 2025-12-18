#!/bin/bash

# Script to setup demo credentials in database
# Run this script to ensure all demo users are in the database

set -e

echo "=========================================="
echo "🔐 Setting up Demo Credentials"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to backend directory
cd "$(dirname "$0")/my-backend"

echo -e "${BLUE}Step 1: Checking database connection...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL CLI (psql) not found. Skipping direct database check.${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL CLI available${NC}"
fi
echo ""

echo -e "${BLUE}Step 2: Running database migrations...${NC}"
if [ -f "migrations/multi-business-setup.sql" ]; then
    echo "Found migration file: migrations/multi-business-setup.sql"
    echo -e "${YELLOW}To run migration manually, use:${NC}"
    echo "  psql \$DATABASE_URL < migrations/multi-business-setup.sql"
    echo ""
else
    echo -e "${RED}❌ Migration file not found!${NC}"
    echo "Looking for: $(pwd)/migrations/multi-business-setup.sql"
    exit 1
fi

echo -e "${BLUE}Step 3: Seeding demo data...${NC}"
if [ -f "seed-demo-data.js" ]; then
    echo "Found seed script: seed-demo-data.js"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
        npm install
        echo ""
    fi
    
    # Run seed script
    echo -e "${GREEN}Running seed script...${NC}"
    node seed-demo-data.js
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Demo data seeded successfully!${NC}"
        echo ""
        echo "=========================================="
        echo "🎉 Demo Users Created"
        echo "=========================================="
        echo ""
        echo -e "${BLUE}Users seeded - check database for details${NC}"
        echo ""
        echo "See secure credential storage for login details"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ Seeding failed!${NC}"
        echo "Check the error messages above."
        exit 1
    fi
else
    echo -e "${RED}❌ Seed script not found!${NC}"
    echo "Looking for: $(pwd)/seed-demo-data.js"
    exit 1
fi

echo -e "${GREEN}=========================================="
echo "✅ Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "You can now:"
echo "  1. Login at /auth/login"
echo "  2. Use configured credentials"
echo "  3. Test Enterprise Admin features"
echo ""
