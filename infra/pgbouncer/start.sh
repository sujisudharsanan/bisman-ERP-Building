#!/bin/bash
# PgBouncer Quick Start Script
# =============================
# Generates configuration and starts PgBouncer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== PgBouncer Setup Script ===${NC}"

# ============================================================================
# STEP 1: Check prerequisites
# ============================================================================

echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are available${NC}"

# ============================================================================
# STEP 2: Create .env file if not exists
# ============================================================================

echo -e "\n${YELLOW}Step 2: Setting up environment...${NC}"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env from .env.example - please edit with your values${NC}"
        echo "Required values:"
        echo "  - PG_HOST: Your PostgreSQL host"
        echo "  - PG_PASSWORD: Your database password"
        echo ""
        read -p "Press Enter after editing .env, or Ctrl+C to cancel..."
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env

echo -e "${GREEN}✓ Environment loaded${NC}"

# ============================================================================
# STEP 3: Generate userlist.txt with password hash
# ============================================================================

echo -e "\n${YELLOW}Step 3: Generating password hash for userlist.txt...${NC}"

if [ -z "$PG_USER" ] || [ -z "$PG_PASSWORD" ]; then
    echo -e "${RED}Error: PG_USER and PG_PASSWORD must be set in .env${NC}"
    exit 1
fi

# Generate MD5 hash
MD5_HASH=$(echo -n "${PG_PASSWORD}${PG_USER}" | md5sum | awk '{print "md5"$1}')
STATS_HASH=$(echo -n "${PGBOUNCER_STATS_PASSWORD:-stats}stats" | md5sum | awk '{print "md5"$1}')
ADMIN_HASH=$(echo -n "${PGBOUNCER_ADMIN_PASSWORD:-admin}pgbouncer" | md5sum | awk '{print "md5"$1}')

# Create userlist.txt
cat > userlist.txt << EOF
;; Auto-generated userlist.txt - $(date)
"${PG_USER}" "${MD5_HASH}"
"pgbouncer" "${ADMIN_HASH}"
"stats" "${STATS_HASH}"
EOF

chmod 600 userlist.txt
echo -e "${GREEN}✓ Generated userlist.txt with password hash${NC}"

# ============================================================================
# STEP 4: Create Docker network if needed
# ============================================================================

echo -e "\n${YELLOW}Step 4: Setting up Docker network...${NC}"

if ! docker network inspect bisman-network &> /dev/null; then
    docker network create bisman-network
    echo -e "${GREEN}✓ Created bisman-network${NC}"
else
    echo -e "${GREEN}✓ bisman-network already exists${NC}"
fi

# ============================================================================
# STEP 5: Start PgBouncer
# ============================================================================

echo -e "\n${YELLOW}Step 5: Starting PgBouncer...${NC}"

docker compose up -d pgbouncer

echo -e "${GREEN}✓ PgBouncer container started${NC}"

# ============================================================================
# STEP 6: Wait for health check
# ============================================================================

echo -e "\n${YELLOW}Step 6: Waiting for health check...${NC}"

MAX_WAIT=30
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' bisman-pgbouncer 2>/dev/null || echo "unknown")
    
    if [ "$STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓ PgBouncer is healthy!${NC}"
        break
    fi
    
    echo "Waiting for PgBouncer to be healthy... ($WAITED/$MAX_WAIT seconds)"
    sleep 2
    WAITED=$((WAITED + 2))
done

if [ "$STATUS" != "healthy" ]; then
    echo -e "${YELLOW}Warning: Health check not passing yet. Check logs:${NC}"
    docker logs bisman-pgbouncer --tail 20
fi

# ============================================================================
# STEP 7: Print connection info
# ============================================================================

echo -e "\n${GREEN}=== PgBouncer is Ready ===${NC}"
echo ""
echo "Connection URL for your application:"
echo -e "${YELLOW}DATABASE_URL=\"postgresql://${PG_USER}:<password>@localhost:${PGBOUNCER_PORT:-6432}/${PG_DATABASE}?pgbouncer=true\"${NC}"
echo ""
echo "Admin console:"
echo -e "  psql -h localhost -p ${PGBOUNCER_PORT:-6432} -U pgbouncer pgbouncer"
echo ""
echo "Useful commands:"
echo "  docker logs -f bisman-pgbouncer    # View logs"
echo "  docker exec -it bisman-pgbouncer psql -p 6432 -U pgbouncer pgbouncer"
echo "  SHOW POOLS;                        # Check pool status"
echo "  SHOW STATS;                        # View statistics"
echo ""
echo -e "${GREEN}Done!${NC}"
