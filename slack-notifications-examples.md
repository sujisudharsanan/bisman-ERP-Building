# Example Slack Notification Payloads

## 🚨 Performance Regression Alert

### Webhook Payload (Failure)

```json
{
  "text": "🚨 Performance Regression Detected",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 Performance CI/CD Failed",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Repository:*\nbisman-ERP-Building"
        },
        {
          "type": "mrkdwn",
          "text": "*Branch:*\nunder-development"
        },
        {
          "type": "mrkdwn",
          "text": "*Commit:*\nabc123def456"
        },
        {
          "type": "mrkdwn",
          "text": "*Author:*\n@developer"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Failed Checks:*\n❌ Bundle Analysis (size +45%)\n❌ Lighthouse CI (LCP 3.2s)\n✅ API Performance\n✅ Database Health\n✅ Storage Check"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Critical Issues:*\n• Bundle size increased from 5.4MB to 7.8MB\n• Largest Contentful Paint exceeded 2.5s threshold\n• Added large dependencies without optimization"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "🕐 Failed at: 2025-10-24 14:35:42 UTC"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Workflow",
            "emoji": true
          },
          "style": "danger",
          "url": "https://github.com/sujisudharsanan/bisman-ERP-Building/actions/runs/12345"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View PR",
            "emoji": true
          },
          "url": "https://github.com/sujisudharsanan/bisman-ERP-Building/pull/42"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Artifacts",
            "emoji": true
          },
          "url": "https://github.com/sujisudharsanan/bisman-ERP-Building/actions/runs/12345/artifacts"
        }
      ]
    }
  ]
}
```

### How it looks in Slack:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🚨 Performance CI/CD Failed                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Repository:               Branch:
bisman-ERP-Building      under-development

Commit:                  Author:
abc123def456             @developer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Failed Checks:
❌ Bundle Analysis (size +45%)
❌ Lighthouse CI (LCP 3.2s)
✅ API Performance
✅ Database Health
✅ Storage Check

Critical Issues:
• Bundle size increased from 5.4MB to 7.8MB
• Largest Contentful Paint exceeded 2.5s threshold
• Added large dependencies without optimization

🕐 Failed at: 2025-10-24 14:35:42 UTC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[View Workflow] [View PR] [View Artifacts]
```

---

## ✅ Monthly Audit Success

### Webhook Payload (Success)

```json
{
  "text": "✅ Monthly Performance Audit Complete",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "✅ Monthly Performance Audit - All Checks Passed",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Repository:*\nbisman-ERP-Building"
        },
        {
          "type": "mrkdwn",
          "text": "*Period:*\nOctober 2025"
        },
        {
          "type": "mrkdwn",
          "text": "*Date:*\n2025-10-01 02:00 UTC"
        },
        {
          "type": "mrkdwn",
          "text": "*Status:*\n🎉 All targets met"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Performance Summary:*\n✅ Bundle Analysis: 3.2MB (-8%)\n✅ Lighthouse CI: Avg 91/100\n✅ API Performance: P95 380ms (-15%)\n✅ Database Health: 285MB (4% bloat)\n✅ Storage Check: All within limits"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*API Latency:*\nP95: 380ms ↓15%"
        },
        {
          "type": "mrkdwn",
          "text": "*LCP Score:*\n1.6s ↓24%"
        },
        {
          "type": "mrkdwn",
          "text": "*Bundle Size:*\n3.1MB ↓9%"
        },
        {
          "type": "mrkdwn",
          "text": "*Cache Hit Rate:*\n96% ↑4%"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*🏆 Achievements:*\n• Cache optimization deployed\n• Code splitting implemented\n• Storage cleanup automated\n• Database indexes optimized"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "📊 Overall Grade: A+ (94/100) | Next audit: November 1, 2025"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Full Report",
            "emoji": true
          },
          "style": "primary",
          "url": "https://github.com/sujisudharsanan/bisman-ERP-Building/actions/runs/12345"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Download Artifacts",
            "emoji": true
          },
          "url": "https://github.com/sujisudharsanan/bisman-ERP-Building/actions/runs/12345/artifacts"
        }
      ]
    }
  ]
}
```

### How it looks in Slack:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ Monthly Performance Audit - All Checks Pass ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Repository:               Period:
bisman-ERP-Building      October 2025

Date:                    Status:
2025-10-01 02:00 UTC     🎉 All targets met

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Performance Summary:
✅ Bundle Analysis: 3.2MB (-8%)
✅ Lighthouse CI: Avg 91/100
✅ API Performance: P95 380ms (-15%)
✅ Database Health: 285MB (4% bloat)
✅ Storage Check: All within limits

API Latency:         LCP Score:
P95: 380ms ↓15%      1.6s ↓24%

Bundle Size:         Cache Hit Rate:
3.1MB ↓9%            96% ↑4%

🏆 Achievements:
• Cache optimization deployed
• Code splitting implemented
• Storage cleanup automated
• Database indexes optimized

📊 Overall Grade: A+ (94/100) | Next audit: November 1, 2025

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[View Full Report] [Download Artifacts]
```

---

## ⚠️ Warning Alert (Non-Critical)

### Webhook Payload (Warning)

```json
{
  "text": "⚠️ Performance Warning",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "⚠️ Performance Warning Detected",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Repository:*\nbisman-ERP-Building"
        },
        {
          "type": "mrkdwn",
          "text": "*Branch:*\nfeature/new-dashboard"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Warnings:*\n⚠️ Bundle size increased by 18% (threshold: 20%)\n⚠️ LCP: 2.3s (target: <2.0s)\n✅ All critical checks passed"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Recommendation:*\nConsider optimizing before merge to maintain performance targets."
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Details"
          },
          "url": "https://github.com/sujisudharsanan/bisman-ERP-Building/actions/runs/12345"
        }
      ]
    }
  ]
}
```

---

## 📝 PR Comment Example

### GitHub PR Comment (Auto-posted)

```markdown
## 📊 Performance CI/CD Report

**Build:** #123  
**Commit:** abc123def  
**Status:** ❌ **FAILED** - Performance regression detected

---

### Bundle Analysis

**Total Bundle Size:** 7.8 MB ❌  
**Previous Size:** 5.4 MB  
**Change:** +2.4 MB (+45%) ⚠️ **Exceeds 20% threshold**

#### Top 5 Largest Pages
- `/super-admin`: 4.2 MB (+3.8 MB) ❌
- `/dashboard`: 2.1 MB (+800 KB) ⚠️
- `/login`: 350 KB (+50 KB) ✅
- `/home`: 420 KB (+30 KB) ✅
- `/settings`: 680 KB (+100 KB) ✅

#### ⚠️ Large Bundles (>5MB)
- `/super-admin`: 4.2 MB

---

### Lighthouse CI

| Page | Performance | LCP | TTI | CLS | Status |
|------|-------------|-----|-----|-----|--------|
| Super Admin | 62 | 3.2s | 3.8s | 0.08 | ❌ |
| Dashboard | 75 | 2.8s | 3.2s | 0.05 | ⚠️ |
| Login | 95 | 1.2s | 1.5s | 0.01 | ✅ |
| Home | 92 | 1.5s | 1.8s | 0.02 | ✅ |

**Issues:**
- ❌ LCP > 2.5s on Super Admin page
- ❌ TTI > 3.0s on Super Admin and Dashboard

---

### API Performance

**Status:** ✅ PASSED

- Total Requests: 12,500
- P95 Latency: 520ms ✅ (target: <700ms)
- P99 Latency: 680ms ✅
- Error Rate: 0.3% ✅

---

### Database Health

**Status:** ✅ PASSED

- Database Size: 248 MB ✅
- Bloat: 4% ✅
- Cache Hit Ratio: 95% ✅
- Unused Indexes: 2 ✅

---

### Storage Check

**Status:** ✅ PASSED

- Uploads: 125 MB ✅
- Logs: 15 MB ✅
- Temp: 8 MB ✅

---

## 🔧 Required Actions

1. **Reduce bundle size** 
   - Remove or replace heavy dependencies (chart.js, lodash, moment.js)
   - Use dynamic imports for large components
   
2. **Optimize images**
   - Use next/image for automatic optimization
   - Compress assets before upload

3. **Add code splitting**
   - Split Super Admin page into smaller chunks
   - Lazy load non-critical components

4. **Fix Lighthouse issues**
   - Optimize LCP by prioritizing hero images
   - Reduce JavaScript blocking time

---

**🚫 PR is blocked until performance issues are resolved.**

[View Full Report](https://github.com/.../actions/runs/12345) | [Download Artifacts](https://github.com/.../actions/runs/12345/artifacts)

---

<sup>Generated by Performance CI/CD Pipeline | [Documentation](CI_CD_PERFORMANCE_GUIDE.md)</sup>
```

---

## 🔔 Slack Channel Setup

### Recommended Channel Structure

```
#erp-alerts (main alerts channel)
  ├─ #erp-ci-cd (all CI/CD notifications)
  ├─ #erp-performance (performance-specific)
  └─ #erp-deployments (deployment notifications)
```

### Notification Rules

| Event | Channel | Severity | Mentions |
|-------|---------|----------|----------|
| CI/CD Failure | #erp-alerts | High | @dev-team |
| Performance Warning | #erp-performance | Medium | - |
| Monthly Audit | #erp-ci-cd | Info | - |
| Critical DB Issue | #erp-alerts | Critical | @dba @oncall |
| Storage Warning | #erp-ci-cd | Low | - |

---

## 🎨 Custom Slack App (Optional)

### Slash Commands

```
/erp-status              → Show current CI/CD status
/erp-benchmark          → Trigger manual benchmark
/erp-lighthouse [url]   → Run Lighthouse audit
/erp-metrics            → Display performance metrics
/erp-deploy             → Approve deployment
```

### Interactive Components

```
[Approve Deployment] [Reject] [View Details]
```

---

**File:** `slack-notifications-examples.md`  
**Purpose:** Reference for Slack integration  
**Last Updated:** October 24, 2025
