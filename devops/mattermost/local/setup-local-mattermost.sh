#!/bin/bash

# Mattermost Local Setup Script for macOS
# This script installs Mattermost server locally without Docker

set -e

echo "🚀 Mattermost Local Setup Script"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check macOS version
echo "📋 Checking system..."
MACOS_VERSION=$(sw_vers -productVersion)
echo "macOS Version: $MACOS_VERSION"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew is not installed!${NC}"
    echo "Please install Homebrew first:"
    echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo -e "${GREEN}✅ Homebrew found${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Installing...${NC}"
    brew install postgresql@15
    brew services start postgresql@15
    echo -e "${GREEN}✅ PostgreSQL installed and started${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL found${NC}"
    # Make sure it's running
    brew services start postgresql@15 2>/dev/null || true
fi

# Create Mattermost database
echo ""
echo "📦 Creating Mattermost database..."

DB_NAME="mattermost_local"
DB_USER="mmuser"
DB_PASS="mmuser_password"

# Drop existing database if exists
dropdb $DB_NAME 2>/dev/null || true

# Create database and user
createdb $DB_NAME

psql $DB_NAME <<EOF
DROP USER IF EXISTS $DB_USER;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

echo -e "${GREEN}✅ Database created: $DB_NAME${NC}"
echo ""

# Create Mattermost directory
MM_DIR="$HOME/mattermost-local"
echo "📁 Creating Mattermost directory: $MM_DIR"
mkdir -p $MM_DIR
cd $MM_DIR

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    MM_ARCH="arm64"
elif [ "$ARCH" = "x86_64" ]; then
    MM_ARCH="amd64"
else
    echo -e "${RED}❌ Unsupported architecture: $ARCH${NC}"
    exit 1
fi

echo "System Architecture: $ARCH (using $MM_ARCH)"

# Download Mattermost
MM_VERSION="9.11.3"  # Using a version known to work on macOS 12.x
MM_FILE="mattermost-${MM_VERSION}-darwin-${MM_ARCH}.tar.gz"
MM_URL="https://releases.mattermost.com/${MM_VERSION}/${MM_FILE}"

echo ""
echo "⬇️  Downloading Mattermost ${MM_VERSION}..."
echo "URL: $MM_URL"

# Remove old download if exists
rm -f $MM_FILE

if curl -L -f "$MM_URL" -o "$MM_FILE"; then
    echo -e "${GREEN}✅ Download successful${NC}"
else
    echo -e "${RED}❌ Download failed. Trying alternative version...${NC}"
    # Try older version that definitely works
    MM_VERSION="9.5.0"
    MM_FILE="mattermost-${MM_VERSION}-darwin-${MM_ARCH}.tar.gz"
    MM_URL="https://releases.mattermost.com/${MM_VERSION}/${MM_FILE}"
    curl -L -f "$MM_URL" -o "$MM_FILE"
fi

# Extract
echo ""
echo "📦 Extracting Mattermost..."
rm -rf mattermost
tar -xzf $MM_FILE
echo -e "${GREEN}✅ Extraction complete${NC}"

# Configure Mattermost
echo ""
echo "⚙️  Configuring Mattermost..."

cd mattermost

# Backup original config
cp config/config.json config/config.json.backup

# Update config with local database settings
cat > config/config.json <<EOF
{
  "ServiceSettings": {
    "SiteURL": "http://localhost:8065",
    "ListenAddress": ":8065",
    "ConnectionSecurity": "",
    "TLSCertFile": "",
    "TLSKeyFile": "",
    "UseLetsEncrypt": false,
    "Forward80To443": false,
    "ReadTimeout": 300,
    "WriteTimeout": 300,
    "EnableInsecureOutgoingConnections": false,
    "EnableMultifactorAuthentication": false,
    "EnableOAuthServiceProvider": false,
    "EnableDeveloper": true
  },
  "TeamSettings": {
    "SiteName": "Mattermost Local",
    "MaxUsersPerTeam": 150,
    "EnableTeamCreation": true,
    "EnableUserCreation": true,
    "RestrictCreationToDomains": ""
  },
  "SqlSettings": {
    "DriverName": "postgres",
    "DataSource": "postgres://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?sslmode=disable&connect_timeout=10",
    "DataSourceReplicas": [],
    "MaxIdleConns": 20,
    "MaxOpenConns": 300,
    "Trace": false,
    "AtRestEncryptKey": ""
  },
  "LogSettings": {
    "EnableConsole": true,
    "ConsoleLevel": "INFO",
    "EnableFile": true,
    "FileLevel": "INFO",
    "FileLocation": ""
  },
  "FileSettings": {
    "EnableFileAttachments": true,
    "MaxFileSize": 52428800,
    "DriverName": "local",
    "Directory": "./data/",
    "EnablePublicLink": false,
    "PublicLinkSalt": ""
  },
  "EmailSettings": {
    "EnableSignUpWithEmail": true,
    "EnableSignInWithEmail": true,
    "EnableSignInWithUsername": true,
    "SendEmailNotifications": false,
    "RequireEmailVerification": false,
    "FeedbackName": "",
    "FeedbackEmail": "",
    "SMTPUsername": "",
    "SMTPPassword": "",
    "SMTPServer": "",
    "SMTPPort": "",
    "ConnectionSecurity": ""
  },
  "PluginSettings": {
    "Enable": true,
    "EnableUploads": true,
    "Directory": "./plugins",
    "ClientDirectory": "./client/plugins"
  }
}
EOF

echo -e "${GREEN}✅ Configuration complete${NC}"

# Create startup script
echo ""
echo "📝 Creating startup scripts..."

cat > start-mattermost.sh <<'SCRIPT_EOF'
#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting Mattermost Local Server..."
echo "======================================"
echo ""

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "⚠️  Starting PostgreSQL..."
    brew services start postgresql@15
    sleep 2
fi

# Start Mattermost
echo "Starting Mattermost on http://localhost:8065"
echo ""
echo "Press Ctrl+C to stop"
echo ""

./bin/mattermost

SCRIPT_EOF

chmod +x start-mattermost.sh

cat > stop-mattermost.sh <<'SCRIPT_EOF'
#!/bin/bash

echo "🛑 Stopping Mattermost..."
pkill -f "bin/mattermost" || echo "Mattermost was not running"
echo "✅ Done"
SCRIPT_EOF

chmod +x stop-mattermost.sh

# Create environment file template
cat > .env.local.mattermost <<EOF
# Local Mattermost Configuration
# Copy this to your my-frontend/.env.local when using local Mattermost

MM_BASE_URL=http://localhost:8065
MM_ADMIN_TOKEN=<generate-after-first-start>
MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_TEAM_SLUG=erp
NEXT_PUBLIC_MM_DEMO_PASSWORD=Welcome@2025
EOF

echo -e "${GREEN}✅ Startup scripts created${NC}"

# Print success message
echo ""
echo "================================================================"
echo -e "${GREEN}🎉 Mattermost Local Installation Complete!${NC}"
echo "================================================================"
echo ""
echo "📍 Installation Directory: $MM_DIR/mattermost"
echo "🌐 URL: http://localhost:8065"
echo "💾 Database: postgresql://localhost:5432/$DB_NAME"
echo ""
echo "🚀 To Start Mattermost:"
echo "   cd $MM_DIR/mattermost"
echo "   ./start-mattermost.sh"
echo ""
echo "🛑 To Stop Mattermost:"
echo "   cd $MM_DIR/mattermost"
echo "   ./stop-mattermost.sh"
echo ""
echo "📋 Next Steps:"
echo "   1. Start Mattermost: ./start-mattermost.sh"
echo "   2. Open http://localhost:8065 in browser"
echo "   3. Create admin account (first user becomes admin)"
echo "   4. Go to Profile → Security → Personal Access Tokens"
echo "   5. Create token for 'ERP Integration'"
echo "   6. Copy token to my-frontend/.env.local:"
echo "      MM_BASE_URL=http://localhost:8065"
echo "      MM_ADMIN_TOKEN=<your-token-here>"
echo ""
echo "📝 Environment template created: .env.local.mattermost"
echo ""
echo "================================================================"
