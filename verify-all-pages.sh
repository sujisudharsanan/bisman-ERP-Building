#!/bin/bash

echo "🔍 Verifying All ERP Pages..."
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL=0
FOUND=0
MISSING=0

check_file() {
    local file=$1
    local name=$2
    TOTAL=$((TOTAL + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $name"
        FOUND=$((FOUND + 1))
    else
        echo -e "${RED}❌${NC} $name"
        MISSING=$((MISSING + 1))
    fi
}

echo -e "${BLUE}📁 System Module (13 pages)${NC}"
check_file "my-frontend/src/modules/system/pages/permission-manager.tsx" "permission-manager.tsx"
check_file "my-frontend/src/modules/system/pages/audit-logs.tsx" "audit-logs.tsx"
check_file "my-frontend/src/modules/system/pages/backup-restore.tsx" "backup-restore.tsx"
check_file "my-frontend/src/modules/system/pages/scheduler.tsx" "scheduler.tsx"
check_file "my-frontend/src/modules/system/pages/system-health-dashboard.tsx" "system-health-dashboard.tsx"
check_file "my-frontend/src/modules/system/pages/integration-settings.tsx" "integration-settings.tsx"
check_file "my-frontend/src/modules/system/pages/error-logs.tsx" "error-logs.tsx"
check_file "my-frontend/src/modules/system/pages/server-logs.tsx" "server-logs.tsx"
check_file "my-frontend/src/modules/system/pages/deployment-tools.tsx" "deployment-tools.tsx"
check_file "my-frontend/src/modules/system/pages/api-integration-config.tsx" "api-integration-config.tsx"
check_file "my-frontend/src/modules/system/pages/system-settings-limited.tsx" "system-settings-limited.tsx"
check_file "my-frontend/src/modules/system/pages/company-setup.tsx" "company-setup.tsx"
check_file "my-frontend/src/modules/system/pages/master-data-management.tsx" "master-data-management.tsx"

echo ""
echo -e "${BLUE}💰 Finance Module (30 pages)${NC}"
check_file "my-frontend/src/modules/finance/pages/financial-statements.tsx" "financial-statements.tsx"
check_file "my-frontend/src/modules/finance/pages/general-ledger.tsx" "general-ledger.tsx"
check_file "my-frontend/src/modules/finance/pages/budgeting-forecasting.tsx" "budgeting-forecasting.tsx"
check_file "my-frontend/src/modules/finance/pages/cash-flow-statement.tsx" "cash-flow-statement.tsx"
check_file "my-frontend/src/modules/finance/pages/company-dashboard.tsx" "company-dashboard.tsx"
check_file "my-frontend/src/modules/finance/pages/period-end-closing.tsx" "period-end-closing.tsx"
check_file "my-frontend/src/modules/finance/pages/cost-center-analysis.tsx" "cost-center-analysis.tsx"
check_file "my-frontend/src/modules/finance/pages/journal-entries-approval.tsx" "journal-entries-approval.tsx"
check_file "my-frontend/src/modules/finance/pages/trial-balance.tsx" "trial-balance.tsx"
check_file "my-frontend/src/modules/finance/pages/journal-entries.tsx" "journal-entries.tsx"
check_file "my-frontend/src/modules/finance/pages/inter-company-reconciliation.tsx" "inter-company-reconciliation.tsx"
check_file "my-frontend/src/modules/finance/pages/fixed-asset-register.tsx" "fixed-asset-register.tsx"
check_file "my-frontend/src/modules/finance/pages/tax-reports.tsx" "tax-reports.tsx"
check_file "my-frontend/src/modules/finance/pages/bank-reconciliation.tsx" "bank-reconciliation.tsx"
check_file "my-frontend/src/modules/finance/pages/cash-flow-forecast.tsx" "cash-flow-forecast.tsx"
check_file "my-frontend/src/modules/finance/pages/payment-gateway-integration.tsx" "payment-gateway-integration.tsx"
check_file "my-frontend/src/modules/finance/pages/foreign-exchange-management.tsx" "foreign-exchange-management.tsx"
check_file "my-frontend/src/modules/finance/pages/loan-management.tsx" "loan-management.tsx"
check_file "my-frontend/src/modules/finance/pages/chart-of-accounts.tsx" "chart-of-accounts.tsx"
check_file "my-frontend/src/modules/finance/pages/invoice-posting.tsx" "invoice-posting.tsx"
check_file "my-frontend/src/modules/finance/pages/period-end-adjustment-entries.tsx" "period-end-adjustment-entries.tsx"
check_file "my-frontend/src/modules/finance/pages/purchase-invoice.tsx" "purchase-invoice.tsx"
check_file "my-frontend/src/modules/finance/pages/payment-entry.tsx" "payment-entry.tsx"
check_file "my-frontend/src/modules/finance/pages/vendor-master.tsx" "vendor-master.tsx"
check_file "my-frontend/src/modules/finance/pages/expense-report.tsx" "expense-report.tsx"
check_file "my-frontend/src/modules/finance/pages/payment-batch-processing.tsx" "payment-batch-processing.tsx"
check_file "my-frontend/src/modules/finance/pages/payment-entry-view.tsx" "payment-entry-view.tsx"
check_file "my-frontend/src/modules/finance/pages/bank-statement-upload.tsx" "bank-statement-upload.tsx"
check_file "my-frontend/src/modules/finance/pages/bank-reconciliation-execute.tsx" "bank-reconciliation-execute.tsx"
check_file "my-frontend/src/modules/finance/pages/payment-approval-queue.tsx" "payment-approval-queue.tsx"

echo ""
echo -e "${BLUE}🛒 Procurement Module (4 pages)${NC}"
check_file "my-frontend/src/modules/procurement/pages/purchase-request.tsx" "purchase-request.tsx"
check_file "my-frontend/src/modules/procurement/pages/supplier-quotation.tsx" "supplier-quotation.tsx"
check_file "my-frontend/src/modules/procurement/pages/supplier-master.tsx" "supplier-master.tsx"
check_file "my-frontend/src/modules/procurement/pages/material-request.tsx" "material-request.tsx"

echo ""
echo -e "${BLUE}⚙️ Operations Module (12 pages)${NC}"
check_file "my-frontend/src/modules/operations/pages/stock-entry.tsx" "stock-entry.tsx"
check_file "my-frontend/src/modules/operations/pages/item-master-limited.tsx" "item-master-limited.tsx"
check_file "my-frontend/src/modules/operations/pages/stock-ledger.tsx" "stock-ledger.tsx"
check_file "my-frontend/src/modules/operations/pages/delivery-note.tsx" "delivery-note.tsx"
check_file "my-frontend/src/modules/operations/pages/quality-inspection.tsx" "quality-inspection.tsx"
check_file "my-frontend/src/modules/operations/pages/sales-order.tsx" "sales-order.tsx"
check_file "my-frontend/src/modules/operations/pages/work-order.tsx" "work-order.tsx"
check_file "my-frontend/src/modules/operations/pages/bom-view.tsx" "bom-view.tsx"
check_file "my-frontend/src/modules/operations/pages/shipping-logistics.tsx" "shipping-logistics.tsx"
check_file "my-frontend/src/modules/operations/pages/stock-entry-transfer.tsx" "stock-entry-transfer.tsx"
check_file "my-frontend/src/modules/operations/pages/sales-order-view.tsx" "sales-order-view.tsx"
check_file "my-frontend/src/modules/operations/pages/asset-register-hub.tsx" "asset-register-hub.tsx"

echo ""
echo -e "${BLUE}📜 Compliance Module (8 pages)${NC}"
check_file "my-frontend/src/modules/compliance/pages/audit-trail.tsx" "audit-trail.tsx"
check_file "my-frontend/src/modules/compliance/pages/policy-management.tsx" "policy-management.tsx"
check_file "my-frontend/src/modules/compliance/pages/regulatory-report-templates.tsx" "regulatory-report-templates.tsx"
check_file "my-frontend/src/modules/compliance/pages/approval-workflow-view.tsx" "approval-workflow-view.tsx"
check_file "my-frontend/src/modules/compliance/pages/contract-management.tsx" "contract-management.tsx"
check_file "my-frontend/src/modules/compliance/pages/litigation-tracker.tsx" "litigation-tracker.tsx"
check_file "my-frontend/src/modules/compliance/pages/document-repository-view.tsx" "document-repository-view.tsx"
check_file "my-frontend/src/modules/compliance/pages/vendor-customer-master-legal.tsx" "vendor-customer-master-legal.tsx"

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✨ SUCCESS! All pages verified!${NC}"
else
    echo -e "${RED}⚠️  WARNING: Some pages are missing!${NC}"
fi
echo "═══════════════════════════════════════════════════════════"
echo -e "📊 Verification Summary:"
echo -e "   Total Pages Expected: ${BLUE}${TOTAL}${NC}"
echo -e "   Pages Found: ${GREEN}${FOUND}${NC}"
echo -e "   Pages Missing: ${RED}${MISSING}${NC}"
echo ""
