# Production Rollout Checklist

Complete these steps in order to deploy the multi-tenant infrastructure.

## Pre-Deployment Checklist

### 1. Environment Preparation
- [ ] Ensure AWS credentials are configured with appropriate permissions
- [ ] Verify Terraform version >= 1.5.0
- [ ] Create S3 bucket for Terraform state (if using remote state)
- [ ] Create DynamoDB table for state locking (if using remote state)

### 2. Secrets Configuration
- [ ] Generate strong JWT secrets (minimum 256 bits)
- [ ] Obtain Stripe API keys (test keys for staging, live for prod)
- [ ] Configure SMTP credentials for alerts
- [ ] Generate random passwords for database and Redis

### 3. Domain & Certificates
- [ ] Register domain or configure DNS delegation
- [ ] Request ACM certificate (will auto-validate if using Route 53)

---

## Phase 1: Core Infrastructure

### Deploy PgBouncer and Update DATABASE_URL
```bash
# 1. Initialize Terraform
cd infra/terraform
terraform init

# 2. Create tfvars file
cat > terraform.tfvars <<EOF
project_name = "bisman-erp"
environment  = "prod"
aws_region   = "us-east-1"
db_instance_class = "db.r6g.large"
redis_node_type   = "cache.r6g.large"
app_image         = "your-ecr-repo/bisman-erp:latest"
domain_name       = "api.yourdomain.com"
EOF

# 3. Plan and apply
terraform plan -out=tfplan
terraform apply tfplan

# 4. Get connection info
terraform output -json > outputs.json
```

**Verification:**
- [ ] RDS primary is reachable from ECS tasks
- [ ] PgBouncer connects to RDS successfully
- [ ] Application starts with PgBouncer connection
- [ ] Monitor DB connections (should be pooled, not 1:1 with app instances)

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'bisman_prod';
```

---

## Phase 2: Read Replica Configuration

### Configure Read Replica Routes
```bash
# Update environment variables
DATABASE_URL_REPLICA=$(terraform output -raw db_replica_address)

# Verify replica lag
aws rds describe-db-instances --db-instance-identifier bisman-erp-prod-replica \
  --query 'DBInstances[0].ReplicaLag'
```

**Verification:**
- [ ] Replica is in sync (lag < 1 second)
- [ ] Read queries route to replica
- [ ] Write queries route to primary
- [ ] Test failover: stop replica and verify fallback to primary

```bash
# Test read routing
curl -X GET https://api.yourdomain.com/api/admin/tenants/123/usage

# Check logs for routing
aws logs tail /aws/ecs/bisman-erp-prod/app --filter-pattern "replica"
```

---

## Phase 3: Usage Metering & Quotas

### Add Middleware
```bash
# Verify middleware is registered in app.js
grep -n "usageMeter\|tenantQuota" my-backend/app.js

# Check environment variables
cat my-backend/.env | grep -E "USAGE_METER|QUOTA"
```

### Run Migrations
```bash
# Create tables
cd my-backend
npx prisma migrate deploy

# Verify tables
psql $DATABASE_URL -c "\\dt *tenant*"
psql $DATABASE_URL -c "\\dt *usage*"
psql $DATABASE_URL -c "\\dt events"
```

**Verification:**
- [ ] `tenant_usage` table exists
- [ ] `tenant_quotas` table exists
- [ ] `events` table exists
- [ ] Usage is being tracked in `client_daily_usage`

### Load Testing
```bash
# Run load test
npm run test:load -- --vus 100 --duration 5m

# Check quota enforcement
curl -X GET https://api.yourdomain.com/api/usage/quota \
  -H "Authorization: Bearer $TOKEN"
```

---

## Phase 4: Billing & Onboarding

### Stripe Configuration
```bash
# Set Stripe environment variables
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_FREE=price_xxx
STRIPE_PRICE_ID_PRO=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxx

# Update secrets in AWS
aws secretsmanager update-secret --secret-id bisman-erp/prod/app-secrets \
  --secret-string '{"STRIPE_SECRET_KEY":"...", ...}'
```

### Configure Stripe Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

**Verification:**
- [ ] Webhook endpoint is accessible
- [ ] Stripe CLI test: `stripe trigger payment_intent.succeeded`
- [ ] Test checkout flow in staging

```bash
# Test with Stripe CLI
stripe listen --forward-to https://api.yourdomain.com/api/webhooks/stripe
stripe trigger invoice.payment_succeeded
```

---

## Phase 5: Scheduled Jobs

### Start Jobs
```bash
# Verify jobs are registered
grep -n "startTrialExpiryJob\|startDailyAggregationJob\|startQuotaAlertJob" my-backend/app.js

# Check cron schedules
TRIAL_EXPIRY_CRON="0 * * * *"       # Hourly
DAILY_AGGREGATION_CRON="0 2 * * *"  # 2 AM daily
QUOTA_ALERT_CRON="30 * * * *"       # Hourly at :30
WEEKLY_AUDIT_CRON="0 0 * * 0"       # Sunday midnight
```

**Verification:**
- [ ] Jobs appear in logs at scheduled times
- [ ] Trial expiry downgrades expired trials
- [ ] Daily aggregation populates `tenant_usage`
- [ ] Quota alerts send when threshold exceeded

---

## Phase 6: Monitoring & Dashboards

### Grafana Dashboards
```bash
# Import dashboards
cd monitoring/grafana/dashboards
for f in *.json; do
  curl -X POST http://grafana:3000/api/dashboards/db \
    -H "Content-Type: application/json" \
    -d @"$f"
done
```

### Prometheus Alerts
```bash
# Apply alert rules
kubectl apply -f monitoring/alerts/

# Verify alerts are loaded
curl http://prometheus:9090/api/v1/rules | jq '.data.groups[].rules[]'
```

**Verification:**
- [ ] Tenant dashboard shows live data
- [ ] SLA metrics display correctly
- [ ] Alerts fire when thresholds crossed
- [ ] Notifications delivered (email, Slack)

---

## Phase 7: Chaos Testing

### Replica Failover Test
```bash
# 1. Note current replica status
aws rds describe-db-instances --db-instance-identifier bisman-erp-prod-replica

# 2. Stop replica (simulates failure)
aws rds stop-db-instance --db-instance-identifier bisman-erp-prod-replica

# 3. Verify app falls back to primary
curl https://api.yourdomain.com/api/health

# 4. Check logs for fallback
aws logs tail /aws/ecs/bisman-erp-prod/app --filter-pattern "fallback\|replica"

# 5. Restart replica
aws rds start-db-instance --db-instance-identifier bisman-erp-prod-replica
```

### Redis Failover Test
```bash
# Trigger failover
aws elasticache test-failover \
  --replication-group-id bisman-erp-prod-redis \
  --node-group-id 0001

# Verify app reconnects
curl https://api.yourdomain.com/api/health
```

### ECS Task Failure
```bash
# Kill random task
TASK_ID=$(aws ecs list-tasks --cluster bisman-erp-prod --query 'taskArns[0]' --output text)
aws ecs stop-task --cluster bisman-erp-prod --task $TASK_ID

# Verify new task starts and ALB routes traffic
watch aws ecs describe-services --cluster bisman-erp-prod --services bisman-erp-prod
```

---

## Post-Deployment Verification

### Health Checks
```bash
# API health
curl https://api.yourdomain.com/health

# Database connectivity
curl https://api.yourdomain.com/api/health/db

# Redis connectivity  
curl https://api.yourdomain.com/api/health/redis
```

### Security Checks
- [ ] SSL/TLS configured correctly (grade A on SSL Labs)
- [ ] WAF rules active
- [ ] Security groups restrict access
- [ ] Secrets not in logs or environment dumps
- [ ] Database not publicly accessible

### Performance Baseline
```bash
# Capture baseline metrics
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://api.yourdomain.com/api/health

# Run benchmark
hey -n 1000 -c 50 https://api.yourdomain.com/api/health
```

---

## Rollback Procedures

### Application Rollback
```bash
# Deploy previous task definition
aws ecs update-service \
  --cluster bisman-erp-prod \
  --service bisman-erp-prod \
  --task-definition bisman-erp-prod:PREVIOUS_VERSION
```

### Database Rollback
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier bisman-erp-prod-restored \
  --db-snapshot-identifier bisman-erp-prod-TIMESTAMP
```

### Infrastructure Rollback
```bash
# Revert Terraform changes
git checkout HEAD~1 -- infra/terraform/
terraform apply
```

---

## Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | ops@company.com |
| Database Admin | dba@company.com |
| Security | security@company.com |
| On-Call | +1-xxx-xxx-xxxx |
