#!/bin/bash
# Task Workflow System - Installation Script
# Runs database migration and installs required dependencies

set -e  # Exit on error

echo "=========================================="
echo "Task Workflow System - Installation"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "my-backend" ]; then
    echo "❌ Error: Please run this script from the BISMAN ERP root directory"
    exit 1
fi

# 1. Install backend dependencies
echo "📦 Installing backend dependencies..."
cd my-backend
npm install socket.io
echo "✅ Socket.IO installed"
cd ..

# 2. Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd my-frontend
npm install socket.io-client
echo "✅ Socket.IO client installed"
cd ..

# 3. Run database migration
echo "🗄️  Running database migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not found in environment"
    echo "Please enter your PostgreSQL connection string:"
    echo "Format: postgresql://user:password@host:port/database"
    read -r DATABASE_URL
fi

# Run migration
echo "Running SQL migration..."
psql "$DATABASE_URL" -f my-backend/prisma/migrations/20251114_task_workflow_system.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

# 4. Insert default approvers (optional)
echo ""
echo "Do you want to insert default approver roles? (y/n)"
read -r INSERT_APPROVERS

if [ "$INSERT_APPROVERS" = "y" ] || [ "$INSERT_APPROVERS" = "Y" ]; then
    echo "ℹ️  Note: This will insert placeholder approver entries"
    echo "You should update these with real user IDs later via the admin panel"
    echo ""
    echo "The migration already includes sample approver inserts."
    echo "Check the task_approvers table and update user IDs as needed."
fi

# 5. Restart backend server
echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart your backend server:"
echo "   cd my-backend && npm run dev"
echo ""
echo "2. Restart your frontend server:"
echo "   cd my-frontend && npm run dev"
echo ""
echo "3. Configure approvers:"
echo "   - Login as SUPER_ADMIN"
echo "   - Navigate to /super-admin/approvers"
echo "   - Assign users to approval levels"
echo ""
echo "4. Test the workflow:"
echo "   - Create a task (Draft status)"
echo "   - Click task to open chat drawer"
echo "   - Click 'Confirm' to start approval chain"
echo "   - Approvers can approve/reject"
echo ""
echo "📚 Read TASK_WORKFLOW_COMPLETE_GUIDE.md for full documentation"
echo ""
