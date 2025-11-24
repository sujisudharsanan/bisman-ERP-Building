# 🚀 DATABASE & SCALABILITY - QUICK REFERENCE CARD

**BISMAN ERP | Ready-to-Use Commands**

---

## 📦 WHAT'S AVAILABLE

### ✅ Scripts Created (All Executable)
1. **database-backup.sh** - Automated backups
2. **database-restore.sh** - Recovery system
3. **database-health-check.sh** - Health monitoring
4. **database-index-audit.js** - Index optimization
5. **k6-login-test.js** - Load testing

---

## ⚡ QUICK COMMANDS

### Database Backup
```bash
# Run backup now
./scripts/database-backup.sh

# Check backups
ls -lh backups/database/

# View manifest
cat backups/database/backup_manifest.json | jq
```

### Database Recovery
```bash
# Interactive restore
./scripts/database-restore.sh

# Restore latest
./scripts/database-restore.sh latest

# List backups
./scripts/database-restore.sh list
```

### Health Check
```bash
# Check health
./scripts/database-health-check.sh

# JSON output
./scripts/database-health-check.sh --json

# With alerts
./scripts/database-health-check.sh --alert
```

### Index Audit
```bash
# Run audit
node scripts/database-index-audit.js

# Review SQL
cat scripts/index-optimization.sql

# Apply (after testing!)
psql -f scripts/index-optimization.sql
```

### Load Testing
```bash
# Install k6
brew install k6  # macOS

# Run smoke test
k6 run scripts/k6-login-test.js

# Load test (edit file first)
k6 run scripts/k6-login-test.js

# Custom
k6 run --vus 10 --duration 30s scripts/k6-login-test.js
```

---

## 🔧 SETUP AUTOMATION

### Crontab (One-Time Setup)
```bash
crontab -e

# Add these lines:

# Backup daily at 2 AM
0 2 * * * cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend && ./scripts/database-backup.sh >> /var/log/db-backup.log 2>&1

# Health check every 5 minutes
*/5 * * * * cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend && ./scripts/database-health-check.sh --alert >> /var/log/db-health.log 2>&1
```

---

## 📊 MONITORING

### Real-Time Dashboard
```bash
# Watch health status
watch -n 5 './scripts/database-health-check.sh --json | jq ".status"'

# Check latest backup
cat backups/database/backup_manifest.json | jq '.[-1]'

# Database size
psql -h localhost -U postgres -d bisman_erp -t -c "SELECT pg_size_pretty(pg_database_size('bisman_erp'));"

# Active connections
psql -h localhost -U postgres -d bisman_erp -t -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

---

## 🎯 PERFORMANCE TARGETS

| Metric | Target | Status |
|--------|--------|--------|
| **P95 Latency** | < 500ms | Use k6 to measure |
| **P99 Latency** | < 1000ms | Use k6 to measure |
| **Success Rate** | > 95% | Use k6 to measure |
| **Cache Hit Ratio** | > 90% | Health check shows |
| **Disk Usage** | < 85% | Health check shows |
| **Connection Pool** | < 80% | Health check shows |

---

## 🆘 TROUBLESHOOTING

### Backup fails
```bash
# Check connection
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME

# Check permissions
ls -la scripts/database-backup.sh
chmod +x scripts/database-backup.sh
```

### Health check unhealthy
```bash
# Check database running
psql -h localhost -U postgres -d bisman_erp -c "SELECT 1;"

# View logs
tail -f /var/log/db-health.log
```

### K6 test fails
```bash
# Check server running
curl http://localhost:5000/health

# Start backend
npm start
```

### High response times
```bash
# Check slow queries
node scripts/database-index-audit.js

# Run VACUUM
psql -d bisman_erp -c "VACUUM ANALYZE;"

# Check indexes
cat scripts/index-optimization.sql
```

---

## 📚 DOCUMENTATION

- **Complete Guide**: `DATABASE_RELIABILITY_SCALABILITY_GUIDE.md`
- **Implementation Summary**: `DATABASE_IMPLEMENTATION_SUMMARY.md`
- **This Card**: `DATABASE_QUICK_REFERENCE.md`

---

## ✅ DAILY CHECKLIST

- [ ] Check backup completed (2 AM)
- [ ] Review health check logs
- [ ] Monitor disk usage
- [ ] Check for long-running queries
- [ ] Review error logs

## ✅ WEEKLY CHECKLIST

- [ ] Run index audit
- [ ] Test backup restore
- [ ] Run load tests
- [ ] Review performance metrics
- [ ] Clean up old backups (automatic)

## ✅ MONTHLY CHECKLIST

- [ ] Verify backup integrity
- [ ] Update test users
- [ ] Review scaling needs
- [ ] Document incidents
- [ ] Update team documentation

---

## 🎉 SUCCESS INDICATORS

✅ Backups running daily  
✅ Health checks passing  
✅ P95 < 500ms  
✅ P99 < 1000ms  
✅ Success rate > 95%  
✅ Zero-cost implementation  

---

**Keep this card handy for daily operations!** 📋

**Questions?** Check the full guides in the repository.
