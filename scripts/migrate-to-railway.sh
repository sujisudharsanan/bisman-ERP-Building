#!/bin/bash

# Railway Database Migration Script
# Migrates new database updates (Bank Accounts & Payment Module) to Railway

set -e  # Exit on error

echo "🚀 BISMAN ERP - Railway Database Migration"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install it with: npm install -g @railway/cli"
    echo "Then run: railway login"
    exit 1
fi

# Function to display menu
show_menu() {
    echo -e "${BLUE}Select migration option:${NC}"
    echo "1. Migrate using Railway CLI (Recommended)"
    echo "2. Migrate using direct DATABASE_URL"
    echo "3. Show migration SQL only"
    echo "4. Backup current database first"
    echo "5. Exit"
    echo ""
}

# Function to get Railway database URL
get_railway_db_url() {
    echo -e "${YELLOW}📡 Fetching Railway database URL...${NC}"
    RAILWAY_DB_URL=$(railway variables get DATABASE_URL 2>/dev/null || echo "")
    
    if [ -z "$RAILWAY_DB_URL" ]; then
        echo -e "${RED}❌ Could not fetch Railway DATABASE_URL${NC}"
        echo "Make sure you're linked to a Railway project:"
        echo "  railway link"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Database URL fetched${NC}"
}

# Function to backup database
backup_database() {
    echo -e "${YELLOW}💾 Creating backup...${NC}"
    
    if [ -n "$RAILWAY_DB_URL" ]; then
        BACKUP_FILE="backup_railway_$(date +%Y%m%d_%H%M%S).sql"
        
        pg_dump "$RAILWAY_DB_URL" > "$BACKUP_FILE" 2>/dev/null || {
            echo -e "${RED}❌ Backup failed${NC}"
            echo "Make sure pg_dump is installed: brew install postgresql"
            return 1
        }
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
        echo ""
    else
        echo -e "${RED}❌ No database URL available${NC}"
        return 1
    fi
}

# Function to check if migration is needed
check_migrations() {
    echo -e "${YELLOW}🔍 Checking which migrations need to be applied...${NC}"
    
    # Check for bank_accounts table
    BANK_ACCOUNTS_EXISTS=$(railway run psql -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_accounts');" 2>/dev/null || echo "false")
    
    # Check for non_privileged_users table
    PAYMENT_MODULE_EXISTS=$(railway run psql -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'non_privileged_users');" 2>/dev/null || echo "false")
    
    echo ""
    echo -e "Bank Accounts table: $([ "$BANK_ACCOUNTS_EXISTS" == "t" ] && echo -e "${GREEN}✅ Exists${NC}" || echo -e "${YELLOW}⚠️  Needs migration${NC}")"
    echo -e "Payment Module tables: $([ "$PAYMENT_MODULE_EXISTS" == "t" ] && echo -e "${GREEN}✅ Exists${NC}" || echo -e "${YELLOW}⚠️  Needs migration${NC}")"
    echo ""
}

# Function to run migration with Railway CLI
migrate_with_railway_cli() {
    echo -e "${BLUE}🎯 Starting migration with Railway CLI...${NC}"
    echo ""
    
    # Check migrations status
    check_migrations
    
    read -p "Do you want to create a backup first? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        get_railway_db_url
        backup_database || echo -e "${YELLOW}⚠️  Continuing without backup${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}📝 Applying Migration 003: Bank Accounts...${NC}"
    railway run psql < database/migrations/003_bank_accounts.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration 003 completed successfully${NC}"
    else
        echo -e "${RED}❌ Migration 003 failed${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}📝 Applying Migration 004: Payment Module...${NC}"
    railway run psql < database/migrations/004_payment_module.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration 004 completed successfully${NC}"
    else
        echo -e "${RED}❌ Migration 004 failed${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🎉 All migrations completed successfully!${NC}"
    
    # Verify tables
    echo ""
    echo -e "${YELLOW}🔍 Verifying created tables...${NC}"
    railway run psql -c "\dt bank_accounts"
    railway run psql -c "\dt non_privileged_users"
    railway run psql -c "\dt payment_requests"
    railway run psql -c "\dt payment_approvals"
}

# Function to migrate with direct DATABASE_URL
migrate_with_url() {
    echo -e "${BLUE}🎯 Migration with direct DATABASE_URL${NC}"
    echo ""
    
    read -p "Enter your Railway DATABASE_URL: " DB_URL
    
    if [ -z "$DB_URL" ]; then
        echo -e "${RED}❌ No URL provided${NC}"
        exit 1
    fi
    
    echo ""
    read -p "Create backup first? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        RAILWAY_DB_URL="$DB_URL"
        backup_database || echo -e "${YELLOW}⚠️  Continuing without backup${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}📝 Applying migrations...${NC}"
    
    psql "$DB_URL" < database/migrations/003_bank_accounts.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration 003 completed${NC}"
    else
        echo -e "${RED}❌ Migration 003 failed${NC}"
        exit 1
    fi
    
    psql "$DB_URL" < database/migrations/004_payment_module.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration 004 completed${NC}"
    else
        echo -e "${RED}❌ Migration 004 failed${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🎉 All migrations completed successfully!${NC}"
}

# Function to show SQL
show_sql() {
    echo -e "${BLUE}📄 Migration SQL Content${NC}"
    echo ""
    echo -e "${YELLOW}=== Migration 003: Bank Accounts ===${NC}"
    echo ""
    cat database/migrations/003_bank_accounts.sql
    echo ""
    echo ""
    echo -e "${YELLOW}=== Migration 004: Payment Module ===${NC}"
    echo ""
    cat database/migrations/004_payment_module.sql
}

# Main menu loop
while true; do
    show_menu
    read -p "Enter your choice (1-5): " choice
    echo ""
    
    case $choice in
        1)
            migrate_with_railway_cli
            break
            ;;
        2)
            migrate_with_url
            break
            ;;
        3)
            show_sql
            echo ""
            ;;
        4)
            get_railway_db_url
            backup_database
            echo ""
            ;;
        5)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            echo ""
            ;;
    esac
done

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify tables in Railway dashboard"
echo "2. Test the application"
echo "3. Check for any errors in logs"
