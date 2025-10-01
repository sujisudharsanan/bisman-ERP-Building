import React from 'react'
import LogoutButton from '@/components/ui/LogoutButton'

export default function DashboardPage(): JSX.Element {
  return (
    <div className="dashboard-root">
      {/* Global logout button */}
      <LogoutButton position="top-right" variant="danger" />
      
      <style>{`
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .dashboard-root {
            background: #1e1e1e;
            color: #d8d9da;
            padding: 10px;
            min-height: 100vh;
        }
        
        @media (min-width: 768px) {
            .dashboard-root {
                padding: 20px;
            }
        }
        
        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .dashboard-header {
            background: #2b2b2b;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #ffa500;
        }
        
        @media (min-width: 768px) {
            .dashboard-header {
                padding: 20px;
                margin-bottom: 20px;
            }
        }
        
        .dashboard-title {
            font-size: clamp(18px, 4vw, 24px);
            font-weight: 600;
            color: #ffa500;
            margin-bottom: 5px;
        }
        
        .dashboard-subtitle {
            color: #888;
            font-size: clamp(12px, 2.5vw, 14px);
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        @media (min-width: 768px) {
            .grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
            }
        }
        
        @media (min-width: 1024px) {
            .grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        .panel {
            background: #2b2b2b;
            border-radius: 8px;
            padding: 12px;
            border: 1px solid #444;
            transition: transform 0.2s;
        }
        
        @media (min-width: 768px) {
            .panel {
                padding: 15px;
            }
        }
        
        .panel:hover {
            transform: translateY(-2px);
            border-color: #666;
        }
        
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            border-bottom: 1px solid #444;
            padding-bottom: 8px;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        @media (min-width: 768px) {
            .panel-header {
                margin-bottom: 15px;
                padding-bottom: 10px;
                flex-wrap: nowrap;
            }
        }
        
        .panel-title {
            font-size: clamp(14px, 3vw, 16px);
            font-weight: 600;
            color: #ffa500;
        }
        
        .panel-type {
            background: #444;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: clamp(10px, 2vw, 12px);
            color: #ccc;
        }
        
        @media (min-width: 768px) {
            .panel-type {
                padding: 2px 8px;
            }
        }
        
        .panel-content {
            height: 150px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        
        @media (min-width: 768px) {
            .panel-content {
                height: 200px;
            }
        }
        
        .graph-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #333 25%, #3a3a3a 25%, #3a3a3a 50%, #333 50%, #333 75%, #3a3a3a 75%);
            background-size: 20px 20px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 14px;
            text-align: center;
            padding: 8px;
        }
        
        .stat-value {
            font-size: clamp(24px, 6vw, 32px);
            font-weight: 700;
            color: #4CAF50;
            margin: 8px 0;
        }
        
        @media (min-width: 768px) {
            .stat-value {
                margin: 10px 0;
            }
        }
        
        .stat-label {
            font-size: clamp(12px, 2.5vw, 14px);
            color: #888;
        }
        
        .gauge-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .gauge-bar {
            height: 20px;
            background: #333;
            border-radius: 10px;
            margin: 5px 0;
            overflow: hidden;
        }
        
        .gauge-fill {
            height: 100%;
            border-radius: 10px;
        }
        
        .gauge-label {
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
        
        .metric-info {
            font-size: 12px;
            color: #666;
            margin-top: 10px;
            padding: 8px;
            background: #333;
            border-radius: 4px;
        }
      `}</style>

      <div className="dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title">Logistics ERP Overview</div>
          <div className="dashboard-subtitle">Prometheus Metrics Dashboard • Timezone: Browser</div>
        </div>

        <div className="grid">
          {/* Row 1 */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">API Requests per Second</div>
              <div className="panel-type">Graph</div>
            </div>
            <div className="panel-content">
              <div className="graph-placeholder">HTTP Request Rate Visualization<br/><small>rate(http_request_duration_seconds_count[1m])</small></div>
            </div>
            <div className="metric-info">Method: GET, POST, PUT, DELETE • Routes: /api/*</div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">API Error Rate (%)</div>
              <div className="panel-type">Stat</div>
            </div>
            <div className="panel-content">
              <div className="stat-value">2.34%</div>
              <div className="stat-label">4xx/5xx Errors</div>
            </div>
            <div className="metric-info">Thresholds: &lt;1% (Good), 1-5% (Warning), &gt;5% (Critical)</div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Latency (p95 / p99)</div>
              <div className="panel-type">Graph</div>
            </div>
            <div className="panel-content">
              <div className="graph-placeholder">Latency Percentiles<br/><small>p95: 245ms, p99: 567ms</small></div>
            </div>
            <div className="metric-info">5-minute rolling average • SLO: p95 &lt; 500ms</div>
          </div>
        </div>

        <div className="grid">
          {/* Row 2 */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Worker Queue Length</div>
              <div className="panel-type">Bar Gauge</div>
            </div>
            <div className="panel-content">
              <div className="gauge-container">
                <div className="gauge-label">
                  <span>Waiting</span>
                  <span>1,234</span>
                </div>
                <div className="gauge-bar">
                  <div className="gauge-fill" style={{ width: '65%', background: '#FF9800' }} />
                </div>

                <div className="gauge-label">
                  <span>Active</span>
                  <span>45</span>
                </div>
                <div className="gauge-bar">
                  <div className="gauge-fill" style={{ width: '15%', background: '#2196F3' }} />
                </div>

                <div className="gauge-label">
                  <span>Completed</span>
                  <span>8,932</span>
                </div>
                <div className="gauge-bar">
                  <div className="gauge-fill" style={{ width: '90%', background: '#4CAF50' }} />
                </div>

                <div className="gauge-label">
                  <span>Failed</span>
                  <span>23</span>
                </div>
                <div className="gauge-bar">
                  <div className="gauge-fill" style={{ width: '5%', background: '#F44336' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Failed Jobs Trend</div>
              <div className="panel-type">Graph</div>
            </div>
            <div className="panel-content">
              <div className="graph-placeholder">Failed Jobs Over Time<br/><small>Last 24 hours trend</small></div>
            </div>
            <div className="metric-info">bull_queue_jobs_failed_total • 1-hour increase window</div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Orders Processed (per hour)</div>
              <div className="panel-type">Stat</div>
            </div>
            <div className="panel-content">
              <div className="stat-value">1,847</div>
              <div className="stat-label">Orders/Hour</div>
            </div>
            <div className="metric-info">Target: 2,000 orders/hour • Trend: +12% vs yesterday</div>
          </div>
        </div>

        <div className="grid">
          {/* Row 3 */}
          <div className="panel" style={{ gridColumn: 'span 1' }}>
            <div className="panel-header">
              <div className="panel-title">Delayed Shipments</div>
              <div className="panel-type">Stat</div>
            </div>
            <div className="panel-content">
              <div className="stat-value" style={{ color: '#F44336' }}>42</div>
              <div className="stat-label">Active Delays</div>
            </div>
            <div className="metric-info">Requires immediate attention • SLA at risk</div>
          </div>

          <div className="panel" style={{ gridColumn: 'span 2' }}>
            <div className="panel-header">
              <div className="panel-title">System Status Summary</div>
              <div className="panel-type">Status</div>
            </div>
            <div className="panel-content">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', width: '100%' }}>
                <div style={{ textAlign: 'center', padding: '15px', background: '#1b5e20', borderRadius: '6px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🟢</div>
                  <div>API Health</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Optimal</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', background: '#f57f17', borderRadius: '6px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🟡</div>
                  <div>Queue Health</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Warning</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', background: '#b71c1c', borderRadius: '6px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🔴</div>
                  <div>Shipments</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Critical</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
