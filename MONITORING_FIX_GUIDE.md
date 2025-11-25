# 🔧 System Monitoring Fix Guide

## 🚨 Issue Identified

The **System Monitoring** page is not showing Grafana dashboards because:

1. ❌ **Docker is not installed** on your macOS system
2. ❌ Grafana and Prometheus containers are not running
3. ⚠️ Port 3001 is being used by your Node.js backend instead of Grafana

## 📊 Current Status

| Service | Expected Port | Current Status | Actual Use |
|---------|--------------|----------------|------------|
| Grafana | 3001 | ❌ Not Running | Node.js backend |
| Prometheus | 9090 | ❌ Not Running | Not in use |
| Next.js Frontend | 3000 | ✅ Running | Working |
| Node.js Backend | 5000/3001 | ✅ Running | Working |

---

## 🎯 Solution Options

### **Option 1: Install Docker Desktop (Recommended for Full Monitoring)**

This will enable the complete monitoring stack with Grafana + Prometheus.

#### Steps:

1. **Install Docker Desktop for macOS:**
   ```bash
   # Download from: https://www.docker.com/products/docker-desktop/
   # Or use Homebrew:
   brew install --cask docker
   ```

2. **Start Docker Desktop:**
   - Open Docker Desktop application
   - Wait for it to fully start (whale icon in menu bar)

3. **Verify Docker is running:**
   ```bash
   docker --version
   docker ps
   ```

4. **Start monitoring stack:**
   ```bash
   cd "/Users/abhi/Desktop/BISMAN ERP"
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

5. **Wait for containers to start (2-3 minutes):**
   ```bash
   docker-compose -f docker-compose.monitoring.yml ps
   ```

6. **Verify Grafana is accessible:**
   ```bash
   curl http://localhost:3001
   # Should show Grafana login page
   ```

7. **Access monitoring dashboards:**
   - Direct Grafana: http://localhost:3001 (admin/admin)
   - Via ERP UI: Enterprise Admin > System Monitoring

---

### **Option 2: Use Alternative System Monitoring Dashboard (Quick Fix)**

If you don't want to install Docker right now, use the existing System Health Dashboard that doesn't require Docker.

#### Steps:

1. **Update monitoring navigation to use System Health Dashboard:**
   
   Create a new route that uses the existing system health dashboard instead of Grafana.

2. **Or temporarily disable the monitoring page:**
   
   Hide the monitoring menu item until Docker is installed.

---

### **Option 3: Install Colima (Lightweight Docker Alternative)**

Colima is a lightweight container runtime for macOS.

```bash
# Install Colima
brew install colima docker

# Start Colima
colima start

# Verify
docker ps

# Start monitoring stack
cd "/Users/abhi/Desktop/BISMAN ERP"
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## 🔨 Quick Implementation: Use System Health Dashboard

Since Docker is not installed, let's redirect to the working System Health Dashboard:

### Update `/my-frontend/src/app/enterprise-admin/monitoring/page.tsx`:

```tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertCircle, FiActivity, FiServer, FiDatabase } from 'react-icons/fi';

export default function MonitoringPage() {
  const router = useRouter();

  // Check if Docker/Grafana is available
  const isGrafanaAvailable = false; // Set to true after Docker is installed

  if (!isGrafanaAvailable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl">
                <FiActivity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  System Monitoring
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Real-time system health and performance metrics
                </p>
              </div>
            </div>
          </div>

          {/* Docker Not Installed Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <FiAlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  Advanced Monitoring Requires Docker
                </h3>
                <p className="text-yellow-800 dark:text-yellow-300 mb-4">
                  The advanced Grafana + Prometheus monitoring stack requires Docker to be installed.
                  In the meantime, you can use the System Health Dashboard for basic monitoring.
                </p>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    To enable advanced monitoring:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                    <li>Install Docker Desktop: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded">brew install --cask docker</code></li>
                    <li>Start Docker Desktop application</li>
                    <li>Run: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded">docker-compose -f docker-compose.monitoring.yml up -d</code></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  See <code>MONITORING_FIX_GUIDE.md</code> for detailed instructions
                </p>
              </div>
            </div>
          </div>

          {/* Available Monitoring Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Health Dashboard */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
                 onClick={() => router.push('/enterprise-admin/monitoring/system-health')}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <FiServer className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    System Health Dashboard
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mb-3">
                    ✓ Available Now
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Basic system monitoring with performance metrics, implementation status, and alerts.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      API Performance Metrics
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Database Health Check
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      System Alerts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Implementation Status
                    </li>
                  </ul>
                  <button className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Open Dashboard →
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Monitoring (Requires Docker) */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-300 dark:border-gray-700 opacity-60">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-300/50 dark:bg-gray-700/50 rounded-lg">
                  <FiDatabase className="w-6 h-6 text-gray-500 dark:text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Advanced Monitoring
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-400 mb-3">
                    ⊘ Requires Docker
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Full monitoring stack with Grafana dashboards, Prometheus metrics, and alerting.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-500">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Real-time CPU, Memory, Disk Usage
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Database Query Performance
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Redis Cache Metrics
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Custom Alert Rules
                    </li>
                  </ul>
                  <button className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-500 rounded-lg cursor-not-allowed" disabled>
                    Install Docker to Enable
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="text-md font-semibold text-blue-900 dark:text-blue-200 mb-3">
              📚 Setup Instructions
            </h4>
            <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
              <div>
                <p className="font-semibold mb-1">Current Setup:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>✅ Backend API running on port 5000</li>
                  <li>✅ Frontend running on port 3000</li>
                  <li>✅ System Health Dashboard available</li>
                  <li>❌ Docker not installed (required for Grafana)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">To enable advanced monitoring:</p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>Install Docker Desktop for macOS</li>
                  <li>Start Docker Desktop application</li>
                  <li>Run the monitoring stack startup command</li>
                  <li>Access Grafana at http://localhost:3001</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original Grafana iframe code (when Docker is installed)
  return (
    <div>
      {/* Original Grafana embedding code goes here */}
    </div>
  );
}
```

---

## 📋 After Installing Docker

Once Docker is installed and running:

1. **Start monitoring stack:**
   ```bash
   cd "/Users/abhi/Desktop/BISMAN ERP"
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Verify containers are running:**
   ```bash
   docker ps
   ```
   
   You should see:
   - `erp-grafana` (port 3001)
   - `erp-prometheus` (port 9090)

3. **Access Grafana:**
   - URL: http://localhost:3001
   - Username: `admin`
   - Password: `admin`

4. **Update the monitoring page:**
   Change `isGrafanaAvailable = false` to `isGrafanaAvailable = true` in the code above.

---

## 🎯 Summary

**Current Issue:** Docker is not installed, so Grafana containers cannot run.

**Immediate Solution:** Use the System Health Dashboard at `/enterprise-admin/monitoring/system-health`

**Long-term Solution:** Install Docker Desktop and start the monitoring stack

**Alternative:** Use Colima as a lightweight Docker alternative

---

## 📞 Need Help?

- Docker Installation: https://docs.docker.com/desktop/install/mac-install/
- Colima (Alternative): https://github.com/abiosoft/colima
- System Health Dashboard: Already working at `/enterprise-admin/monitoring/system-health`

---

**Status:** ⚠️ Docker required for advanced monitoring  
**Workaround:** ✅ Basic monitoring available via System Health Dashboard  
**Next Step:** Install Docker Desktop or use System Health Dashboard
