# CI/CD Performance Pipeline - Quick Reference

## 🎯 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BISMAN ERP CI/CD Pipeline                    │
│                     Performance Guardrails                       │
└─────────────────────────────────────────────────────────────────┘

                    Triggers:
    ┌──────────────────┬──────────────────┬──────────────────┐
    │   Push/PR to:    │  Monthly Audit   │  Manual Trigger  │
    │  main/dev/stage  │  1st @ 2AM UTC   │   (any time)     │
    └──────────────────┴──────────────────┴──────────────────┘
                              ↓
    ┌──────────────────────────────────────────────────────────┐
    │  Job 1: Setup & Build (5 min)                            │
    │  • Cache node_modules                                     │
    │  • Build backend + frontend                               │
    │  • Generate bundle stats                                  │
    └──────────────────────────────────────────────────────────┘
                              ↓
    ┌─────────────────────┬─────────────────────┬──────────────┐
    │                     │                     │              │
    ▼                     ▼                     ▼              ▼

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Bundle    │  │ Lighthouse  │  │     API     │  │  Database   │
│  Analysis   │  │     CI      │  │ Performance │  │   Health    │
│   (2 min)   │  │  (10 min)   │  │   (8 min)   │  │   (3 min)   │
├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤
│Compare size │  │Test 4 pages │  │Artillery    │  │Size check   │
│Fail >20%    │  │LCP < 2.5s   │  │P95 < 700ms  │  │Bloat check  │
│PR comment   │  │TTI < 3s     │  │Errors < 5%  │  │Index usage  │
│HTML report  │  │CLS < 0.1    │  │500 users    │  │Cache ratio  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  
│   Storage   │  │   Docker    │  
│    Check    │  │    Build    │  
│   (1 min)   │  │  (10 min)   │  
├─────────────┤  ├─────────────┤  
│/uploads<1GB │  │Multi-stage  │  
│/logs <100MB │  │Alpine base  │  
│Old files    │  │Prod deps    │  
│Cleanup OK   │  │150-300MB    │  
└─────────────┘  └─────────────┘  

    │             │             │             │
    └─────────────┴─────────────┴─────────────┘
                  ↓
    ┌──────────────────────────────────────────────────────────┐
    │  Job 8: Notifications (1 min)                            │
    │  • Generate summary report                                │
    │  • Send Slack alerts (if failed)                          │
    │  • Comment on PR with metrics                             │
    │  • Upload artifacts                                       │
    └──────────────────────────────────────────────────────────┘
                  ↓
    ┌──────────────┬────────────────┐
    │  All Pass?   │  Any Fail?     │
    │  ✅ Deploy   │  ❌ Block PR   │
    │  Continue    │  Alert Slack   │
    └──────────────┴────────────────┘
```

---

## 📊 Performance Gates Summary

| Gate | Metric | Threshold | Auto-Fail |
|------|--------|-----------|-----------|
| 📦 **Bundle** | Size increase | >20% | ✅ |
| 🔦 **Lighthouse** | LCP | >2.5s | ✅ |
| 🔦 **Lighthouse** | TTI | >3.0s | ✅ |
| 🔦 **Lighthouse** | CLS | >0.1 | ✅ |
| ⚡ **API** | P95 latency | >700ms | ✅ |
| ⚡ **API** | Error rate | >5% | ✅ |
| 🗄️ **Database** | Size | >5GB | ✅ |
| 🗄️ **Database** | Bloat | >20% | ✅ |
| 💾 **Storage** | Uploads | >1GB | ⚠️ |
| 💾 **Storage** | Logs | >100MB | ⚠️ |

---

## 🚀 Quick Commands

### Setup
```bash
./setup-ci-cd.sh              # Automated setup
```

### Local Testing
```bash
# Bundle analysis
cd my-frontend && ANALYZE=true npm run build

# Lighthouse
lighthouse http://localhost:3000/super-admin --view

# API load test
artillery run artillery-config.yml

# Database health
psql -U postgres -d bisman_erp -f db-health-check.sql

# Storage check
du -sh my-backend/{uploads,logs,tmp}
```

### GitHub Actions
```bash
# Trigger manually
gh workflow run performance-ci.yml

# View latest run
gh run list --workflow=performance-ci.yml

# Download artifacts
gh run download <run-id>
```

---

## 📁 Key Files

```
.github/workflows/
  └── performance-ci.yml          # Main workflow (1000 lines)

lighthouserc.json                 # Lighthouse config
lighthouse-budget.json            # Performance budgets

Dockerfile.optimized              # Multi-stage Docker build
docker-compose.ci.yml             # Docker Compose for CI

setup-ci-cd.sh                    # Automated setup script

CI_CD_PERFORMANCE_GUIDE.md        # Complete documentation
CI_CD_IMPLEMENTATION_COMPLETE.md  # Implementation summary
```

---

## 🎯 Success Criteria

### ✅ Pre-Merge Validation
- Bundle size increase <20%
- Lighthouse scores >80 (performance)
- API P95 latency <700ms
- No database issues
- Storage within limits

### ✅ Monthly Audit
- Comprehensive performance report
- Month-over-month comparisons
- Trend analysis
- Slack notification

### ✅ Continuous Monitoring
- Real-time Slack alerts
- Automated artifact storage
- PR performance comments
- Historical tracking

---

## 📞 Support

**Documentation:**
- Complete Guide: `CI_CD_PERFORMANCE_GUIDE.md`
- Implementation: `CI_CD_IMPLEMENTATION_COMPLETE.md`

**Setup Help:**
```bash
./setup-ci-cd.sh --help
```

**GitHub Actions:**
```
Repository → Actions → Performance CI/CD Pipeline
```

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** October 24, 2025
